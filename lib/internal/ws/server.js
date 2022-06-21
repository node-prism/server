import EventEmitter from "node:events";
import { WebSocketServer } from "ws";
export class WSContext {
    constructor(wss, connection, payload) {
        this.wss = wss;
        this.connection = connection;
        this.payload = payload;
    }
}
class Latency {
    constructor() {
        this.checking = false;
        this.start = 0;
        this.end = 0;
        this.ms = 0;
        this.interval = null;
    }
    request() {
        // if (this.checking) {}
        this.start = Date.now();
        this.checking = true;
    }
    response() {
        this.end = Date.now();
        this.ms = this.end - this.start;
        this.checking = false;
    }
}
class Ping {
    constructor() {
        this.interval = null;
    }
}
function bufferToCommand(buf) {
    const decoded = new TextDecoder("utf-8").decode(buf);
    if (!decoded)
        return { id: 0, command: "", payload: {} };
    try {
        const parsed = JSON.parse(decoded);
        return { id: parsed.id, command: parsed.command, payload: parsed.payload };
    }
    catch (e) {
        return { id: 0, command: "", payload: {} };
    }
}
export class Connection extends EventEmitter {
    constructor(socket, request) {
        super();
        this.alive = true;
        this.socket = socket;
        this.request = request;
        this.id = request.headers["sec-websocket-key"];
        this.remoteAddress = request.socket.remoteAddress;
        this.applyListeners();
        this.startIntervals();
    }
    startIntervals() {
        this.latency = new Latency();
        this.ping = new Ping();
        this.latency.interval = setInterval(() => {
            if (this.alive) {
                if (typeof this.latency.ms === "number") {
                    this.send({ command: "prism:latency", payload: this.latency.ms });
                }
                this.latency.request();
                this.send({ command: "prism:latency:request", payload: {} });
            }
        }, 5000);
        this.ping.interval = setInterval(() => {
            if (!this.alive) {
                this.emit("close");
            }
            this.alive = false;
            this.send({ command: "prism:ping", payload: {} });
        }, 30000);
    }
    stopIntervals() {
        clearInterval(this.ping.interval);
        clearInterval(this.latency.interval);
    }
    send(cmd) {
        this.socket.send(JSON.stringify(cmd));
    }
    applyListeners() {
        this.socket.on("close", () => {
            this.emit("close");
        });
        this.socket.on("message", (data) => {
            const command = bufferToCommand(data);
            if (command.command === "prism:latency:response") {
                this.latency.response();
                return;
            }
            else if (command.command === "prism:pong") {
                this.alive = true;
                return;
            }
            this.emit("message", data);
        });
    }
}
function getServerOptions(opts) {
    opts.noServer = true;
    return opts;
}
export class WebSocketTokenServer extends WebSocketServer {
    constructor(opts) {
        super(getServerOptions(opts));
        this.connections = {};
        this.commands = {};
        this.globalMiddlewares = [];
        this.middlewares = {};
        this.remoteAddressToConnections = {};
        this.applyListeners();
    }
    destroyConnection(c) {
        c.stopIntervals();
        this.remoteAddressToConnections[c.remoteAddress] =
            this.remoteAddressToConnections[c.remoteAddress].filter((cn) => cn.id !== c.id);
        delete this.connections[c.id];
        if (!this.remoteAddressToConnections[c.remoteAddress].length) {
            delete this.remoteAddressToConnections[c.remoteAddress];
        }
    }
    applyListeners() {
        this.on("connection", (socket, req) => {
            const connection = new Connection(socket, req);
            this.connections[connection.id] = connection;
            this.remoteAddressToConnections[req.socket.remoteAddress] = [
                connection,
            ].concat(this.remoteAddressToConnections[req.socket.remoteAddress] || []);
            connection.once("close", () => {
                this.destroyConnection(connection);
                this.emit("close", connection);
                // TODO: If a ping timeout emitted 'close' and we
                // ended up here, then the socket may still be open.
                // Maybe we should try and close it?
            });
            connection.on("message", (buf) => {
                try {
                    const { id, command, payload } = bufferToCommand(buf);
                    this.runCommand(id, command, payload, connection);
                }
                catch (e) {
                    this.emit("error", e);
                }
            });
        });
    }
    broadcast(command, payload) {
        const cmd = JSON.stringify({ command, payload });
        Object.values(this.connections).forEach((c) => {
            c.socket.send(cmd);
        });
    }
    /**
     * Given a Connection, broadcasts only to all other Connections that share
     * the same connection.remoteAddress.
     *
     * Use cases: auth changes, push notifications.
     */
    broadcastRemoteAddress(c, command, payload) {
        const cmd = JSON.stringify({ command, payload });
        this.remoteAddressToConnections[c.remoteAddress].forEach((cn) => {
            cn.socket.send(cmd);
        });
    }
    registerCommand(command, callback, ...middlewares) {
        this.commands[command] = callback;
        this.addMiddlewareToCommand(command, ...middlewares);
    }
    addMiddlewareToCommand(command, ...middlewares) {
        if (middlewares.length) {
            this.middlewares[command] = this.middlewares[command] || [];
            this.middlewares[command] = middlewares.concat(this.middlewares[command]);
        }
    }
    async runCommand(id, command, payload, connection) {
        const c = new WSContext(this, connection, payload);
        try {
            if (!this.commands[command]) {
                throw new Error(`Command [${command}] not found.`);
            }
            if (this.globalMiddlewares.length) {
                for (const mw of this.globalMiddlewares) {
                    await mw(c);
                }
            }
            if (this.middlewares[command] && this.middlewares[command].length) {
                for (const mw of this.middlewares[command]) {
                    await mw(c);
                }
            }
            const result = await this.commands[command](c);
            connection.send({ id, command, payload: result });
        }
        catch (e) {
            const payload = { error: e.message ?? "Unknown error." };
            connection.send({ id, command, payload });
        }
    }
}
//# sourceMappingURL=server.js.map