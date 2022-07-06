import logger, { LogLevel } from "../../shared/logger";
import glob from "fast-glob";
import cron from "node-cron";
import { ScheduleModuleExports } from "../../shared/definitions";
import { invariant } from "../../shared/utils";
import loadModule from "../../internal/loader/main";
import { PrismApp } from "../../shared/definitions";

export { CRON } from "./common";

export interface Schedule {
  /** A cron expression. */
  cron: string;

  /** Whether or not to schedule this. */
  scheduled: boolean;

  /** A timezone string, e.g. "America/Los_Angeles". */
  timezone: string;
}

function validateScheduleModuleExports(module: ScheduleModuleExports, filename: string) {
  if (!module.config) {
    throw new Error(`expected a "config" export in ${filename}`);
  }
  if (!module.config.cron) {
    throw new Error(`expected a "config.cron" export in ${filename}`);
  }
  if (!module.default) {
    throw new Error(`expected a default export in ${filename}`);
  }
  if (typeof module.default !== "function") {
    throw new Error(`expected default export to be a function in ${filename}`);
  }
}

export default async function createSchedules(app: PrismApp) {
  const filenames = await glob(`${app.root}/schedules/**/[!_]*.{mjs,js,jsx,ts,tsx}`);

  for (const filename of filenames) {
    const module = await loadModule<ScheduleModuleExports>(filename);
    invariant(module, `failed to load module ${filename}`);

    // Throws if !module.config.cron || !module.default
    validateScheduleModuleExports(module, filename);


    if (!cron.validate(module.config.cron)) {
      throw new Error(`invalid cron schedule: ${module.config.cron}`);
    }

    logger({ level: LogLevel.DEBUG, scope: "schedules" }, "creating schedule defined in", filename);

    cron.schedule(
      module.config.cron,
      async (now: Date) => await module.default(now),
      {
        scheduled: module.config.scheduled ?? true,
        timezone: module.config.timezone ?? "America/Los_Angeles",
      }
    );

    if (module.default.constructor.name !== "AsyncFunction") {
      const err = `schedule default export must be async: ${filename}`;
      throw new Error(err);
    }
  }
}
