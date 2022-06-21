/**
 * @param {() => T} callback Thing to do when cache pair doesn't exist
 * or is invalid.
 * @param {Array<any>} inputs Inputs are stringified and used as the
 * cache key.
 * @param {string|number} death time in ms or string to convert to ms (e.g. 5min) after which
 * the cache entry is invalidated.
 */
export default function useCache<T>(callback: (...callbackInputs: any) => T, inputs: Array<any>, death: string | number): T;
