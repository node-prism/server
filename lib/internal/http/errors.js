import path from "node:path";
import { existsSync } from "node:fs";
import loadModule from "#internal/loader/main.js";
/**
 * Finds `errors.ts` at @param rootDir. If this file exists,
 * it is expected to export default an array of express-compatible
 * error handlers. These error handlers will be registered with core.app.
 */
export default async function createErrorHandlers(core, rootDir) {
    const errorsFile = path.join(rootDir, "/errors.ts");
    if (!existsSync(errorsFile)) {
        return;
    }
    const errors = await loadModule(errorsFile);
    const handlers = errors.default;
    if (!Array.isArray(handlers)) {
        throw new Error(`Expected errors.ts to export an array of error handlers.`);
    }
    handlers.forEach(handler => {
        core.app.use(handler);
    });
}
//# sourceMappingURL=errors.js.map