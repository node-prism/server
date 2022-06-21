/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import EventEmitter from "node:events";
import { IncomingMessage } from "node:http";
import { ServerOptions, WebSocket, WebSocketServer } from "ws";
export declare class WSContext {
    wss: WebSocketTokenServer;
    connection: Connection;
    payload: any;
    constructor(wss: WebSocketTokenServer, connection: Connection, payload: any);
}
export interface Command {
    id?: number;
    command: string;
    payload: any;
}
declare class Latency {
    checking: boolean;
    start: number;
    end: number;
    ms: number;
    interval: NodeJS.Timeout;
    request(): void;
    response(): void;
}
declare class Ping {
    interval: NodeJS.Timeout;
}
export declare class Connection extends EventEmitter {
    id: string;
    socket: WebSocket;
    remoteAddress: string;
    request: IncomingMessage;
    latency: Latency;
    ping: Ping;
    alive: boolean;
    constructor(socket: WebSocket, request: IncomingMessage);
    startIntervals(): void;
    stopIntervals(): void;
    send(cmd: Command): void;
    applyListeners(): void;
}
export declare type SocketMiddleware = (c: WSContext) => Promise<any>;
interface SocketServerOptions extends ServerOptions {
}
export declare class WebSocketTokenServer extends WebSocketServer {
    connections: {
        [connectionId: string]: Connection;
    };
    commands: {
        [commandName: string]: Function;
    };
    globalMiddlewares: SocketMiddleware[];
    middlewares: {
        [key: string]: SocketMiddleware[];
    };
    remoteAddressToConnections: {
        [address: string]: Connection[];
    };
    constructor(opts: SocketServerOptions);
    destroyConnection(c: Connection): void;
    applyListeners(): void;
    broadcast(command: string, payload: any): void;
    /**
     * Given a Connection, broadcasts only to all other Connections that share
     * the same connection.remoteAddress.
     *
     * Use cases: auth changes, push notifications.
     */
    broadcastRemoteAddress(c: Connection, command: string, payload: any): void;
    registerCommand(command: string, callback: Function, ...middlewares: SocketMiddleware[]): void;
    addMiddlewareToCommand(command: string, ...middlewares: SocketMiddleware[]): void;
    runCommand(id: number, command: string, payload: any, connection: Connection): Promise<void>;
}
export {};
