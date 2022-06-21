/// <reference types="node" />
import { SocketMiddleware } from "../internal/ws/server.js";
import { Server } from "node:http";
import { Express } from "express";
import Queue from "../internal/queues/index.js";
declare type Method = {
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
export interface HTTPCore {
    app: Express;
    server: Server;
    root: string;
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
export {};
