import { HTTPCore } from "./shared/definitions.js";
export declare function createAPI(rootDir: string, middlewares?: Function[]): Promise<HTTPCore>;
export { HTTPCore };
