import path from "node:path";
import fs from "node:fs/promises";
import log, { LogLevel } from "#shared/logger.js";
export default async function loadMiddleware(dirname, filename, defaultMiddleware = []) {
    const parent = dirname === "."
        ? defaultMiddleware
        : await loadMiddleware(path.dirname(dirname), filename, defaultMiddleware);
    const absolute = await findFile(path.join(dirname, "_middleware.mjs"), path.join(dirname, "_middleware.js"), path.join(dirname, "_middleware.ts"), path.join(dirname, "_middleware.tsx"));
    if (!absolute)
        return parent;
    const exports = await import(absolute);
    if (!exports.default)
        throw new Error("Middleware must 'export default []'.");
    if (Object.keys(exports).length > 1 || Object.keys(exports).length < 1)
        throw new Error("Middleware should export only one object: default");
    log({ level: LogLevel.DEBUG, scope: "mw" }, "use middleware", path.join(dirname, path.basename(absolute)));
    return [...parent, ...exports.default];
}
/**
 * Find which file exists based on possible names. Returns absolute path so we
 * can import it.
 */
async function findFile(...filenames) {
    for (const filename of filenames) {
        try {
            await fs.access(filename);
            return path.resolve(filename);
        }
        catch {
            // Ignore
        }
    }
    return null;
}
//# sourceMappingURL=middleware.js.map