import dotenv from "dotenv";
import express from "express";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "http";
import path from "path";
import createErrorHandlers from "./internal/http/errors";
import createHTTPHandlers from "./internal/http/main";
import { createQueues } from "./internal/queues";
import createSchedules from "./internal/schedules";
import { createSocketHandlers } from "./internal/ws/main";
import { WebSocketTokenServer } from "./internal/ws/server";
import { LogLevel } from "./shared";
import { HTTPCore } from "./shared/definitions";
import logger from "./shared/logger";
import selfPath from "./shared/path";


dotenv.config();

export interface PrismApp {
  app: express.Application;
  server: ServerHTTP | ServerHTTPS;
  root: string;
  wss: WebSocketTokenServer;
}

export async function createApi(appRoot: string, app: express.Express, server: ServerHTTP | ServerHTTPS): Promise<PrismApp> {
  const api = {
    app,
    server,
    root: path.join("/", path.resolve(path.dirname(selfPath()), appRoot)),
    wss: new WebSocketTokenServer({ path: "/" })
  };

  try {
    await createHTTPHandlers(api);
    await createSocketHandlers(api);
    await createQueues(api);
    await createSchedules(api);
  } catch (e) {
    logger({ level: LogLevel.ERROR }, String(e));
    throw e;
  }

  await createErrorHandlers(api);

  return api;
}

export { HTTPCore };

