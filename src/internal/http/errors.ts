import { HTTPCore } from ".";
import path from "node:path";
import { existsSync } from "node:fs";
import loadModule from "../../internal/loader/main";

/**
 * Finds `errors.ts` at @param rootDir. If this file exists,
 * it is expected to export default an array of express-compatible
 * error handlers. These error handlers will be registered with core.app.
 */
export default async function createErrorHandlers(
  core: HTTPCore,
  rootDir: string
): Promise<any> {
  const errorsFile = path.join(rootDir, "/errors.ts");
  if (!existsSync(errorsFile)) {
    return;
  }

  const errors = await loadModule<{ default: (err: any, req: any, res: any, next: any) => void[] }>(errorsFile);
  const handlers = errors.default;

  if (!Array.isArray(handlers)) {
    throw new Error(
      `Expected errors.ts to export an array of error handlers.`
    );
  }

  handlers.forEach(handler => {
    core.app.use(handler);
  });
}
