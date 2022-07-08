import glob from "fast-glob";
import assert from "node:assert";
import EventEmitter from "node:events";
import { QueueModuleExports } from "../../shared/definitions";
import logger, { LogLevel } from "../../shared/logger";
import { invariant } from "../../shared/utils";
import { duration, getUuid, sleep } from "../../shared";
import loadModule from "../../internal/loader/main";
import { PrismApp } from "../../shared/definitions";

interface QueueTask {
  uuid: string;
  payload: any;
  callback?: ({ uuid, payload }: { uuid: string, payload: any }) => void;
}


interface QueueConfig {
  /** When a worker becomes free, it will wait `delay` before working. */
  delay?: string | number;
  /** Number of simultaneous async workers. */
  concurrency?: number;
  /** A task will fail after timeout ms. */
  timeout?: string | number;

  /**
   * groups are used to scope this queue to a specific key.
   *
   * @example:
   * mailQueue.group(recipient.address).push(sendEmail);
   *
   * The options (delay, concurrency, timeout) are inherited from the queue
   * unless defined here, except for `concurrency` which defaults to 1.
   */
  groups?: {
    delay: string | number;
    concurrency: number;
    timeout?: string | number;
    /** The period of inactivity duration that, when reached, partitions will destroy themselves. */
    expiration?: string | number;
  }
}

function validateQueueModuleExports(module: any) {
  if (!module.queue) {
    throw new Error('queues must export a "queue".');
  }
  if (!module.default || typeof module.default !== "function") {
    throw new Error("queues default export must be a function.")
  }
}

export async function createQueues(app: PrismApp) {
  const filenames = await glob(`${app.root}/queues/**/[!_]*.{mjs,js,jsx,ts,tsx}`);

  for (const filename of filenames) {
    const module = await loadModule<QueueModuleExports>(filename);
    invariant(module, `failed to load module ${filename}`);

    // Throws if !module.queue || !module.default || module.default != function
    validateQueueModuleExports(module);

    logger({ level: LogLevel.DEBUG, scope: "queues" }, "creating queue defined in", filename);

    module.queue.executor = module.default;

    if (module.queue.executor.constructor.name !== "AsyncFunction") {
      const err = `queue default export must be async: ${filename}`;
      throw new Error(err);
    }
  }
}

export default class Queue<Payload> extends EventEmitter {
  readonly config: QueueConfig;
  readonly delay_ms: number;
  readonly timeout_ms: number;
  readonly concurrency: number;
  readonly emitter = new EventEmitter();
  readonly bucketQueue: any[] = [];
  /** Number of tasks currently being executed. */
  private inflight = 0;
  /** Number of tasks currently in the queue and awaiting completion. */
  private size = 0;
  /** Independent queues limited to 1 concurrent task. */
  private groups = new Map<string, Queue<Payload>>();
  /** Inactivity duration before group queue self-destruction. */
  private expiration: number = 0;
  private expirationInterval: NodeJS.Timeout = null;
  private shouldExpire = false;
  private isGroup = false;
  /** If this is a group, parentQueue is the queue that spawned it. */
  private parentQueue: Queue<Payload> = null;
  private timeouts: { [uuid: string]: NodeJS.Timeout } = {};
  executor: Function;

  constructor(config: QueueConfig) {
    super();
    this.config = config;
    this.delay_ms = duration(config.delay, ".5s");
    this.timeout_ms = duration(config.timeout, "1m");
    this.concurrency = config.concurrency ?? 1;

    assert(this.concurrency > 0, new Error("'concurrency' must be greater than 0"));

    this.emitter.on("new", this.processTasks.bind(this));

    this.emitter.on("complete", this.cycle.bind(this));
    this.emitter.on("timeout", this.cycle.bind(this));
    this.emitter.on("failed", this.cycle.bind(this));

    this.emitter.on("new", (d: { task: { uuid: string, payload: Payload } }) => {
      this.emit("new", d);
      this.parentQueue?.emit("new", d);
      logger({ level: LogLevel.DEBUG }, "queue: new task");
    });
    this.emitter.on("newgroup", (name: string) => {
      this.emit("newgroup", name);
      this.parentQueue?.emit("newgroup", name);
      logger({ level: LogLevel.DEBUG }, "queue: new group");
    });
    this.emitter.on("timeout", (d: { task: { uuid: string } }) => {
      this.emit("timeout", d);
      this.parentQueue?.emit("timeout", d);
      logger({ level: LogLevel.DEBUG }, "queue: task timeout");
    });
    this.emitter.on("complete", (d: { task: { uuid: string, payload: Payload } }) => {
      this.emit("complete", d);
      this.parentQueue?.emit("complete", d);
      logger({ level: LogLevel.DEBUG }, "queue: task complete");
    });
    this.emitter.on("groupdestroy", (name: string) => {
      this.emit("groupdestroy", name);
      this.parentQueue?.emit("groupdestroy", name);
      logger({ level: LogLevel.DEBUG }, "queue: group destroyed");
    });
    this.emitter.on("failed", (d: { task: { uuid: string, payload: Payload } }) => {
      this.emit("failed", d);
      this.parentQueue?.emit("failed", d);
      logger({ level: LogLevel.DEBUG }, "queue: task failed");
    });
  }

  cycle() {
    this.inflight -= 1;
    this.processTasks();
  }

  #startExpirationTimer(expirationSeconds: string | number) {
    this.expiration = duration(expirationSeconds, 0);
    // This should never be true anyways, but...
    if (!this.isGroup) return;
    if (this.expiration) {
      this.expirationInterval = setInterval(() => {
        if (this.shouldExpire) {
          this.emitter.emit("destroy");
        }
        this.shouldExpire = true;
      }, this.expiration);
    }
  }

  private async processTasks() {
    if (this.inflight >= this.concurrency || this.size === 0) {
      return;
    }

    if (this.isGroup && this.inflight === 0 && this.size === 0) {
      this.shouldExpire = true;
      return;
    }

    this.shouldExpire = false;
    
    // Get the lowest index (highest priority) task
    const priorityIndex = this.bucketQueue.findIndex(entries => entries.length);

    assert(priorityIndex >= 0, `expected the queue to contain entries since the queue size is ${this.size}.`);

    this.inflight += 1;

    // Pick a task from a FIFO queue
    const nextTask = this.bucketQueue[priorityIndex].shift();

    this.size -= 1;

    assert(nextTask, "expected the item list to contain an entry since findIndex() returned != -1.");

    const { uuid, payload, callback } = nextTask;

    if (this.delay_ms) {
      await sleep(this.delay_ms);
    }

    if (this.timeout_ms) {
      try {
        await Promise.race([this.createTimeoutPromise(uuid), this.executor(payload)]);
        callback({ uuid, payload });
        this.emitter.emit("complete", { task: { uuid, payload } });
        clearTimeout(this.timeouts[uuid]);
      } catch (err) {
        this.emitter.emit("failed", { task: { uuid, payload } });
      }
    } else {
      try {
        await this.executor(payload);
        callback({ uuid, payload });
        this.emitter.emit("complete", { task: { uuid, payload } });
      } catch (err) {
        this.emitter.emit("failed", { task: { uuid, payload } });
      }
    }
  }

  createTimeoutPromise(uuid: string) {
    return new Promise((_, reject) => {
      this.timeouts[uuid] = setTimeout(() => {
        this.emitter.emit("timeout", { task: { uuid } });
        reject("Timed out.");
      }, this.timeout_ms);
    });
  }

  /**
   * Push a task to the queue.
   * `0` is the highest priority value.
   * If no priority is supplied, it's priority is equal to
   * the length of the current bucketQueue, giving it the lowest
   * possible priority.
   */
  push(payload: Payload, { callback, priority }: { callback?: () => void, priority?: number } = {}) {
    if (priority === null || priority === undefined) {
      priority = this.bucketQueue.length;
    }

    assert(priority >= 0, new Error("'priority' must be >= 0"));

    if (priority >= this.bucketQueue.length) {
      const fillers = new Array(priority - this.bucketQueue.length + 1)
        .fill(0)
        .map(() => []);
      this.bucketQueue.push(...fillers);
    }

    const task: QueueTask = { uuid: getUuid(), payload, callback };

    this.bucketQueue[priority].push(task);
    this.size += 1;
    this.emitter.emit("new", { task });

    return task.uuid;
  }

  /**
   * A group returns a new Queue or existing Queue
   * that relates to the given name. They are short living
   * and expire after 5s.
   */
  group(name: string): Queue<Payload> {
    if (this.groups.has(name)) {
      return this.groups.get(name);
    }

    this.emitter.emit("newgroup", { name });

    const group = this.groups
      .set(
        name,
        new Queue({
          ...this.config,
          concurrency: 1,
          ...(this.config.groups || {}),
        })
      )
      .get(name);

    group.isGroup = true;
    group.parentQueue = this;
    group.#startExpirationTimer(this.config?.groups?.expiration ?? "10s");
    group.executor = this.executor;

    group.emitter.on("destroy", () => {
      clearInterval(group.expirationInterval);
      this.groups.delete(name);
      this.emitter.emit("groupdestroy", name);
    });

    return group;
  }
}
