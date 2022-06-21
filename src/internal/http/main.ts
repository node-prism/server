import { NextFunction, Request, Response } from "express";
import glob from "fast-glob";
import path from "node:path";
import { isPromise } from "node:util/types";
import { Key, pathToRegexp } from "path-to-regexp";

import loadModule from "#internal/loader/main.js";
import loadMiddleware from "#internal/loader/middleware.js";
import log, { LogLevel } from "#shared/logger.js";
import { invariant } from "#shared/utils.js";
import {
  HTTPCore,
  HTTPModuleExports,
  RouteDefinition,
} from "#shared/definitions.js";
import ExpressContext from "./context.js";

function getRelevantRoute(route: string, req: Request) {
  let ret = {
    path: {},
    query: {},
    body: {},
    headers: {},
    bearer: "",
  };

  // path
  const keys: Key[] | undefined = [];
  pathToRegexp(route, keys);
  keys.forEach((key) => {
    ret.path[key.name] = req.params[key.name];
  });

  // query
  ret.query = req.query;
  ret.body = req.body;
  ret.headers = req.headers;

  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length && parts[0].toLowerCase() === "bearer") {
      ret.bearer = parts[1];
    }
  }

  return ret;
}

function wrapHandler(handler: Function, route: string) {
  const wrapped = async (req: Request, res: Response, next: NextFunction) => {
    const rel = getRelevantRoute(route, req);
    const context = new ExpressContext(req, res, next);
    const runner = async () => {
      let params: any[] = [context, rel];
      let ret = handler(...params);

      if (isPromise(ret)) {
        ret = await ret;
      }
    };

    try {
      await runner();
    } catch (e) {
      if (res.headersSent) {
        return next(e);
      }
      return next(e);
    }
  };

  return wrapped;
}

function createRouteHandlers(
  module: HTTPModuleExports,
  middleware: any,
  route: string,
  core: HTTPCore
) {
  log({ level: LogLevel.DEBUG, scope: "http" }, route);

  if (module.default && typeof module.default === "function") {
    core.app.all(route, ...middleware, wrapHandler(module.default, route));
    log(
      { level: LogLevel.DEBUG, scope: "http" },
      `${route} | method: any -> export default`
    );
  }

  ["get", "put", "post", "patch", "del", "options"].forEach((method) => {
    if (module[method] && typeof module[method] === "function") {
      // Append per-method middleware to the end of the middleware list.
      let methodMiddleware = module?.middleware?.[method] || [];
      if (methodMiddleware && !Array.isArray(methodMiddleware))
        methodMiddleware = [methodMiddleware];
      if (methodMiddleware.length)
        methodMiddleware = wrapMiddlewareWithHTTPContext(
          route,
          methodMiddleware
        );

      core.app[method === "del" ? "delete" : method](
        route,
        [...middleware, ...methodMiddleware],
        wrapHandler(module[method], route)
      );

      log(
        { level: LogLevel.DEBUG, scope: "http" },
        `${route} | method: ${
          method === "del" ? "DELETE" : method.toUpperCase()
        } -> export "${module[method].name}"`
      );
    }
  });
}

export default async function createHTTPHandlers(
  core: HTTPCore,
  rootDir: string
): Promise<RouteDefinition[]> {
  const p = path.join(rootDir, "/http/");
  const filenames = await glob(`${p}**/[!_]*.{mjs,js,jsx,ts,tsx}`);
  const dupes = new Map<string, string>();

  /**
   * Routes are sorted so that:
   * - Routes without path parameters (e.g. /user/profile) are first
   * - Routes with path parameters (e.g. /user/:id) are next
   * - Routes with catch-all's (e.g. /user/:id*) are last
   *
   * Defining the express handlers in this way ensures that
   * navigating to, for example, /user/profile is caught by
   * `api/user/profile.ts` instead of `api/user/[id].ts`.
   */
  const standard: string[] = [];

  const withParams: string[] = [];
  const re_withParams = /\[.*?\]/g;

  const withCatchAll: string[] = [];
  const re_catchAll = /\[\.{3}.*?\]/g;

  filenames.forEach((fn) => {
    if (re_catchAll.test(fn)) {
      withCatchAll.push(fn);
    } else if (re_withParams.test(fn)) {
      withParams.push(fn);
    } else {
      standard.push(fn);
    }
  });

  // Sort such that /user/:foo/:bar is always created after /user/:foo/bar
  withParams.sort(
    (a, b) => a.match(re_withParams).length - b.match(re_withParams).length
  );
  withCatchAll.sort(
    (a, b) => a.match(re_catchAll).length - b.match(re_catchAll).length
  );

  const sorted = [...standard, ...withParams, ...withCatchAll];

  const defs: RouteDefinition[] = [];

  for (const filename of sorted) {
    const module = await loadModule<HTTPModuleExports>(filename);
    invariant(module, `failed to load module ${filename}`);

    let route = pathFromFilename(filename.replace(`${rootDir}/http/`, "/"));
    // .build/api/_authenticated/admin/index.ts -> .build/api/admin/index.ts
    route = route.replace(/\/\_(?:\w|['-]\w)+\//g, "/");

    const signature = route.replace(/:(.*?)(\/|$)/g, ":$2");
    const identical = dupes.get(signature);

    if (identical)
      throw new Error(
        `duplicate routes: "${identical}" and "${filename}": ${signature}`
      );

    dupes.set(signature, filename);

    log(
      { level: LogLevel.DEBUG, scope: "http" },
      `route ${route} (${filename})`
    );

    let middleware = await loadMiddleware<Function>(
      path.dirname(filename),
      filename
    );
    middleware = wrapMiddlewareWithHTTPContext(route, middleware);

    createRouteHandlers(module, middleware, route, core);
    defs.push({ route, filename });
  }

  return defs;
}

function wrapMiddlewareWithHTTPContext(route: string, middleware: Function[]) {
  return middleware.map((fn) => {
    function handler(req: Request, res: Response, next: NextFunction) {
      const ec = new ExpressContext(req, res, next);
      const relevant = getRelevantRoute(route, req);
      try {
        fn(ec, relevant);
      } catch (e) {
        console.log("middleware wrapper handler caught error", e);
      }
      return;
    }

    // Give this handler the same 'name' as the provided middleware
    Object.defineProperty(handler, "name", { value: fn.name, writable: false });

    return handler;
  });
}

function pathFromFilename(filename: string): string {
  const basename = path.basename(filename, path.extname(filename)).normalize();
  const directory = path.dirname(filename).normalize();
  const withoutIndex =
    basename === "index"
      ? directory
      : path.join(directory, basename).normalize();

  const renamed = renamePathProperties(withoutIndex);
  validatePathParameters(renamed);
  return renamed;
}

function renamePathProperties(filename: string): string {
  return filename.replace(/\[(\.{3})?(.*?)\]/gi, (_, variadic, name) => {
    if (!/^[a-z0-9_-]+$/i.test(name))
      throw new Error(
        "path parameters must be alphanumeric, dash, or underscore"
      );
    return variadic ? `:${name}*` : `:${name}`;
  });
}

function validatePathParameters(path: string) {
  const keys: Key[] | undefined = [];
  pathToRegexp(path, keys);

  if (new Set(keys.map((key) => key.name)).size < keys.length)
    throw new Error("Found two parameters with the same name");

  const catchAll = keys.findIndex(({ modifier }) => modifier === "*");
  if (catchAll >= 0 && catchAll !== keys.length - 1)
    throw new Error(
      "the catch-all parameter can only come at the end of the path. invalid path: " +
        path
    );
}
