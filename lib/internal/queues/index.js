var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Queue_instances, _Queue_startExpirationTimer;
import glob from "fast-glob";
import assert from "node:assert";
import EventEmitter from "node:events";
import loadModule from "#internal/loader/main.js";
import duration from "#shared/duration.js";
import log, { LogLevel } from "#shared/logger.js";
import { invariant, sleep } from "#shared/utils.js";
import { getUuid } from "#shared/uuid.js";
function validateQueueModuleExports(module) {
    if (!module.queue) {
        throw new Error('queues must export a "queue".');
    }
    if (!module.default || typeof module.default !== "function") {
        throw new Error("queues default export must be a function.");
    }
}
export async function createQueues(_core, rootDir) {
    const filenames = await glob(`${rootDir}/queues/**/[!_]*.{mjs,js,jsx,ts,tsx}`);
    for (const filename of filenames) {
        const module = await loadModule(filename);
        invariant(module, `failed to load module ${filename}`);
        // Throws if !module.queue || !module.default || module.default != function
        validateQueueModuleExports(module);
        log({ level: LogLevel.DEBUG, scope: "queues" }, "creating queue defined in", filename);
        module.queue.executor = module.default;
        if (module.queue.executor.constructor.name !== "AsyncFunction") {
            const err = `queue default export must be async: ${filename}`;
            throw new Error(err);
        }
    }
}
export default class Queue extends EventEmitter {
    constructor(config) {
        super();
        _Queue_instances.add(this);
        this.emitter = new EventEmitter();
        this.bucketQueue = [];
        /** Number of tasks currently being executed. */
        this.inflight = 0;
        /** Number of tasks currently in the queue and awaiting completion. */
        this.size = 0;
        /** Independent queues limited to 1 concurrent task. */
        this.groups = new Map();
        /** Inactivity duration before group queue self-destruction. */
        this.expiration = 0;
        this.expirationInterval = null;
        this.shouldExpire = false;
        this.isGroup = false;
        /** If this is a group, parentQueue is the queue that spawned it. */
        this.parentQueue = null;
        this.timeouts = {};
        this.config = config;
        this.delay_ms = duration(config.delay, ".5s");
        this.timeout_ms = duration(config.timeout, "1m");
        this.concurrency = config.concurrency ?? 1;
        assert(this.concurrency > 0, new Error("'concurrency' must be greater than 0"));
        this.emitter.on("new", this.processTasks.bind(this));
        this.emitter.on("complete", this.cycle.bind(this));
        this.emitter.on("timeout", this.cycle.bind(this));
        this.emitter.on("failed", this.cycle.bind(this));
        this.emitter.on("new", (d) => {
            this.emit("new", d);
            this.parentQueue?.emit("new", d);
            log({ level: LogLevel.DEBUG }, "queue: new task");
        });
        this.emitter.on("newgroup", (name) => {
            this.emit("newgroup", name);
            this.parentQueue?.emit("newgroup", name);
            log({ level: LogLevel.DEBUG }, "queue: new group");
        });
        this.emitter.on("timeout", (d) => {
            this.emit("timeout", d);
            this.parentQueue?.emit("timeout", d);
            log({ level: LogLevel.DEBUG }, "queue: task timeout");
        });
        this.emitter.on("complete", (d) => {
            this.emit("complete", d);
            this.parentQueue?.emit("complete", d);
            log({ level: LogLevel.DEBUG }, "queue: task complete");
        });
        this.emitter.on("groupdestroy", (name) => {
            this.emit("groupdestroy", name);
            this.parentQueue?.emit("groupdestroy", name);
            log({ level: LogLevel.DEBUG }, "queue: group destroyed");
        });
        this.emitter.on("failed", (d) => {
            this.emit("failed", d);
            this.parentQueue?.emit("failed", d);
            log({ level: LogLevel.DEBUG }, "queue: task failed");
        });
    }
    cycle() {
        this.inflight -= 1;
        this.processTasks();
    }
    async processTasks() {
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
        const { uuid, payload } = nextTask;
        if (this.delay_ms) {
            await sleep(this.delay_ms);
        }
        if (this.timeout_ms) {
            try {
                await Promise.race([this.createTimeoutPromise(uuid), this.executor(payload)]);
                this.emitter.emit("complete", { task: { uuid, payload } });
                clearTimeout(this.timeouts[uuid]);
            }
            catch (err) {
                this.emitter.emit("failed", { task: { uuid, payload } });
            }
        }
        else {
            try {
                await this.executor(payload);
                this.emitter.emit("complete", { task: { uuid, payload } });
            }
            catch (err) {
                this.emitter.emit("failed", { task: { uuid, payload } });
            }
        }
    }
    createTimeoutPromise(uuid) {
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
    push(payload, priority) {
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
        const task = { uuid: getUuid(), payload };
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
    group(name) {
        if (this.groups.has(name)) {
            return this.groups.get(name);
        }
        this.emitter.emit("newgroup", { name });
        const group = this.groups
            .set(name, new Queue({
            ...this.config,
            concurrency: 1,
            ...(this.config.groups || {}),
        }))
            .get(name);
        group.isGroup = true;
        group.parentQueue = this;
        __classPrivateFieldGet(group, _Queue_instances, "m", _Queue_startExpirationTimer).call(group, this.config?.groups?.expiration ?? "10s");
        group.executor = this.executor;
        group.emitter.on("destroy", () => {
            clearInterval(group.expirationInterval);
            this.groups.delete(name);
            this.emitter.emit("groupdestroy", name);
        });
        return group;
    }
}
_Queue_instances = new WeakSet(), _Queue_startExpirationTimer = function _Queue_startExpirationTimer(expirationSeconds) {
    this.expiration = duration(expirationSeconds, 0);
    // This should never be true anyways, but...
    if (!this.isGroup)
        return;
    if (this.expiration) {
        this.expirationInterval = setInterval(() => {
            if (this.shouldExpire) {
                this.emitter.emit("destroy");
            }
            this.shouldExpire = true;
        }, this.expiration);
    }
};
//# sourceMappingURL=index.js.map