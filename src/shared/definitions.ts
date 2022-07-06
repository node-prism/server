import { SocketMiddleware } from "../internal/ws/server";
import { Server } from "node:http";
import { Express } from "express";
import Queue from "../internal/queues/index";

type Method = {
  (): any;
  middleware?: Function;
};

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
  default?: Function;
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

