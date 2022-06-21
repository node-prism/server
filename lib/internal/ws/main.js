import glob from "fast-glob";
import { STATUS_CODES } from "node:http";
import path from "node:path";
import { parse } from "node:url";
import loadModule from "#internal/loader/main.js";
import loadMiddleware from "#internal/loader/middleware.js";
import log, { LogLevel } from "#shared/logger.js";
import { WebSocketTokenServer } from "./server.js";
/**
 * socket
 * ├── _middleware.ts
 * ├── authenticate.ts
 * └── jobs
 *     ├── _middleware.ts
 *     └── start-job.ts
 *
 * Given the filename `.build/socket/jobs/start-job.js`, loads:
 * - .build/socket/_middleware.js
 * - .build/socket/jobs/_middleware.js
 * - .build/socket/jobs/start-job.js `middleware` export (Function[]), if any
 */
async function getSocketMiddleware(module, filename) {
    let middleware = await loadMiddleware(path.dirname(filename), filename);
    let moduleMiddleware = module?.middleware;
    if (!moduleMiddleware)
        moduleMiddleware = [];
    if (!Array.isArray(moduleMiddleware))
        moduleMiddleware = [moduleMiddleware];
    middleware = middleware.concat(moduleMiddleware);
    return middleware;
}
/**
 * The idea here as that a file at /sockets/a/b/c/d.ts
 * will be reachable at ws(s)://localhost/ and it's
 * command name will be "/a/b/c/d".
 *
 * The module's default export is the command executor.
 */
export async function createSocketHandlers(core, rootDir) {
    const p = path.join(rootDir, "/socket/");
    const filenames = await glob(`${p}**/[!_]*.{mjs,js,jsx,ts,tsx}`);
    const handlers = new Map();
    for (const filename of filenames) {
        const module = await loadModule(filename);
        if (!module)
            throw new Error(`Failed to load module: ${filename}`);
        if (!module.default)
            throw new Error(`Socket command modules must export default.`);
        let route = parentDirname(filename.replace(`${rootDir}/socket/`, "/"));
        log({ level: LogLevel.DEBUG, scope: "ws" }, "socket namespace:", route);
        route = route.replace(/\/\_(?:\w|['-]\w)+\//g, "/");
        // if (!handlers.get(route)) {
        //   handlers.set(route, new WebSocketTokenServer({ path: route, noServer: true }));
        // }
        if (!handlers.get("/")) {
            handlers.set("/", new WebSocketTokenServer({ path: "/", noServer: true }));
        }
        const cmd = path.normalize(`${route}/${path.basename(filename, path.extname(filename)).normalize()}`);
        const middleware = await getSocketMiddleware(module, filename);
        // handlers.get(route).registerCommand(cmd, module.default, ...middleware);
        handlers.get("/").registerCommand(cmd, module.default, ...middleware);
        log({ level: LogLevel.DEBUG, scope: "ws" }, `command: ${cmd} (wscat -c ws://localhost:PORT/ -x '{"command": "${cmd}", "payload": {}}')`);
    }
    core.server.on("upgrade", (req, socket, head) => {
        const { pathname } = parse(req.url);
        const handler = handlers.get(pathname);
        if (handler) {
            handler.handleUpgrade(req, socket, head, (client, req) => {
                handler.emit("connection", client, req);
            });
        }
        else {
            socket.write([
                `HTTP/1.0 400 ${STATUS_CODES[400]}`,
                "Connection: close",
                "Content-Type: text/html",
                `Content-Length: ${Buffer.byteLength(STATUS_CODES[400])}`,
                "",
                STATUS_CODES[400],
            ].join("\r\n"));
            socket.destroy();
        }
    });
}
function parentDirname(filename) {
    const directory = path.dirname(filename).normalize();
    return directory;
}
//# sourceMappingURL=main.js.map