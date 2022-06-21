import log, { LogLevel } from "#shared/logger.js";
import glob from "fast-glob";
import cron from "node-cron";
import { invariant } from "../../shared/utils.js";
import loadModule from "../loader/main.js";
export { CRON } from "./common.js";
function validateScheduleModuleExports(module, filename) {
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
export default async function createSchedules(core, rootDir) {
    const filenames = await glob(`${rootDir}/schedules/**/[!_]*.{mjs,js,jsx,ts,tsx}`);
    for (const filename of filenames) {
        const module = await loadModule(filename);
        invariant(module, `failed to load module ${filename}`);
        // Throws if !module.config.cron || !module.default
        validateScheduleModuleExports(module, filename);
        if (!cron.validate(module.config.cron)) {
            throw new Error(`invalid cron schedule: ${module.config.cron}`);
        }
        log({ level: LogLevel.DEBUG, scope: "schedules" }, "creating schedule defined in", filename);
        cron.schedule(module.config.cron, async (now) => await module.default(now), {
            scheduled: module.config.scheduled ?? true,
            timezone: module.config.timezone ?? "America/Los_Angeles",
        });
        if (module.default.constructor.name !== "AsyncFunction") {
            const err = `schedule default export must be async: ${filename}`;
            throw new Error(err);
        }
    }
}
//# sourceMappingURL=index.js.map