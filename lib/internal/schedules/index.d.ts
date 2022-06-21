import { HTTPCore } from "../../shared/definitions.js";
export { CRON } from "./common.js";
export interface Schedule {
    /** A cron expression. */
    cron: string;
    /** Whether or not to schedule this. */
    scheduled: boolean;
    /** A timezone string, e.g. "America/Los_Angeles". */
    timezone: string;
}
export default function createSchedules(core: HTTPCore, rootDir: string): Promise<void>;
