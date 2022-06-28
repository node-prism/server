import path from "node:path";

import logger, { LogLevel } from "../../shared/logger";


export default async function loadModule<ModuleExports>(filename: string, defaultMiddleware = {}): Promise<Readonly<ModuleExports>> {
  const fromProjectRoot = path.join("/", filename).slice(1);
  const absolute = path.resolve(fromProjectRoot);

  logger({ level: LogLevel.DEBUG, scope: "loader" }, "import", fromProjectRoot);

  const module = await import(absolute);

  return module;
}
