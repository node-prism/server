import duration from "../../shared/duration";

function stringify(prev: any, next: any): string {
  if (String(next) === "[object Object]") next = JSON.stringify(next);
  return prev + next;
}

interface CacheEntry {
  /** On entry, this gets the value of Date.now() */
  entered: number;
  /** Unix timestamp signifying cache death. */
  death: number;
  /** The result of the cache callback. */
  output: any;
}

class CacheMap extends Map<string, CacheEntry> {
  i = 0;
  frequency;

  /**
   * Create a new CacheMap.
   * @param frequency How many `set`s should be called before the CacheMap
   * purges its expired entries.
   * e.g.
   * frequency of `1` means purge is called every time `set` is called.
   * frequency of `5` means purge is called every 5th time `set` is called.
   */
  constructor(frequency: number = 100) {
    super();
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

  set(key: string, value: CacheEntry): this {
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
export default function useCache<T>(callback: (...callbackInputs: any) => T, inputs: Array<any>, death: string | number): T {
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

