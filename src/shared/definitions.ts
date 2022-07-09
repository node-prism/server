import { SocketMiddleware, WebSocketTokenServer, WSContext } from "../internal/ws/server";
import Queue from "../internal/queues/index";
import express from "express";
import { Server as ServerHTTP } from "http";
import { Server as ServerHTTPS } from "http";


type Method = {
  (): any;
  middleware?: Function;
};

export interface PrismApp {
  app: express.Application;
  server: ServerHTTP | ServerHTTPS;
  root: string;
  wss: WebSocketTokenServer;
}

export interface HTTPModuleExports {
  default?: Function;

  get?: Method;
  post?: Method;
  put?: Method;
  patch?: Method;
  del?: Method;

  middleware?: Function[];
}

export interface SocketModuleExports {
  default?: SocketMiddleware;
  middleware?: SocketMiddleware[];
}

export interface RouteDefinition {
  route: string;
  filename: string;
}

export interface QueueModuleExports {
  default: Function;
  queue: Queue<any>;
}

export interface ScheduleModuleExports {
  default: Function;
  config: {
    cron: string;
    scheduled: boolean;
    timezone: string;
  };
}

