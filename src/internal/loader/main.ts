import path from "node:path";

import log, { LogLevel } from "#shared/logger.js";


export default async function loadModule<ModuleExports>(filename: string, defaultMiddleware = {}): Promise<Readonly<ModuleExports>> {
  const fromProjectRoot = path.join("/", filename).slice(1);
  const absolute = path.resolve(fromProjectRoot);

  log({ level: LogLevel.DEBUG, scope: "loader" }, "import", fromProjectRoot);

  const module = await import(absolute);

  return module;
}
