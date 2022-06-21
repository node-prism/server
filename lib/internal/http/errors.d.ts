import { HTTPCore } from ".";
/**
 * Finds `errors.ts` at @param rootDir. If this file exists,
 * it is expected to export default an array of express-compatible
 * error handlers. These error handlers will be registered with core.app.
 */
export default function createErrorHandlers(core: HTTPCore, rootDir: string): Promise<any>;
