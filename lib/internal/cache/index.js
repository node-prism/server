import duration from "#shared/duration.js";
function stringify(prev, next) {
    if (String(next) === "[object Object]")
        next = JSON.stringify(next);
    return prev + next;
}
class CacheMap extends Map {
    /**
     * Create a new CacheMap.
     * @param frequency How many `set`s should be called before the CacheMap
     * purges its expired entries.
     * e.g.
     * frequency of `1` means purge is called every time `set` is called.
     * frequency of `5` means purge is called every 5th time `set` is called.
     */
    constructor(frequency = 100) {
        super();
        this.i = 0;
        this.frequency = frequency;
    }
    /**
     * `purge` iterates the entire map, removing expired entries.
     * Entries are `CacheEntry` type, so they have a `death` property.
     */
    purge() {
        if (++this.i >= this.frequency) {
            this.i = 0;
            for (const [key, value] of this.entries()) {
                if (Date.now() > value.death) {
                    this.delete(key);
                }
            }
        }
    }
    set(key, value) {
        this.purge();
        return super.set(key, value);
    }
}
const bucket = new CacheMap(1);
/**
 * @param {() => T} callback Thing to do when cache pair doesn't exist
 * or is invalid.
 * @param {Array<any>} inputs Inputs are stringified and used as the
 * cache key.
 * @param {string|number} death time in ms or string to convert to ms (e.g. 5min) after which
 * the cache entry is invalidated.
 */
export default function useCache(callback, inputs, death) {
    const key = inputs.reduce(stringify, "");
    const entry = bucket.get(key);
    const now = Date.now();
    if (entry && (now < entry.death)) {
        return entry.output;
    }
    const output = callback(...inputs);
    bucket.set(key, { entered: now, death: now + duration(death, "5m"), output });
    return output;
}
//# sourceMappingURL=index.js.map