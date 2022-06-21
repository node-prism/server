import { HTTPCore, RouteDefinition } from "#shared/definitions.js";
export default function createHTTPHandlers(core: HTTPCore, rootDir: string): Promise<RouteDefinition[]>;
