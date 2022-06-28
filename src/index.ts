import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import path from "path";
import createErrorHandlers from "./internal/http/errors";
import createHTTPHandlers from "./internal/http/main";
import { createQueues } from "./internal/queues";
import createSchedules from "./internal/schedules";
import { createSocketHandlers } from "./internal/ws/main";
import { LogLevel } from "./shared";
import { HTTPCore } from "./shared/definitions";
import logger from "./shared/logger";
import selfPath from "./shared/path";


dotenv.config();

function applyDefaultSecurity(app: express.Application) {
  // disable x-powered-by header
  app.disable("x-powered-by");

  // disable MIME sniffing
  app.set("x-content-type-options", "nosniff");

  // disable IE compat mode
  app.set("x-ua-compatible", "ie=edge");

  // re-enable xss filter if disabled
  app.set("x-xss-protection", "1; mode=block");
}

export async function createAPI(
  rootDir: string,
  middlewares: Function[] = []
): Promise<HTTPCore> {
  const app = express();
  const server = createServer(app);
  const root = path.resolve(path.dirname(selfPath()));
  const core = { app, server, root };

  applyDefaultSecurity(core.app);

  core.app.use(express.json());

  middlewares.forEach((m) => {
    core.app.use(m as any);
  });

  core.app.set("view engine", "ejs");
  core.app.set("views", path.join(root, process.env.VIEWS_PATH ?? "/views/"));

  try {
    await createHTTPHandlers(core, rootDir);
    await createSocketHandlers(core, rootDir);
    await createQueues(core, rootDir);
    await createSchedules(core, rootDir);
  } catch (e) {
    logger({ level: LogLevel.ERROR }, String(e));
    throw e;
  }

  await createErrorHandlers(core, rootDir);

  return core;
}

export {HTTPCore};

