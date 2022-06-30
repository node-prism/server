/**
 * https://github.com/extendedjs/duration
 *
 * ISC License
 *
 * Copyright (c) 2019-2020, Richard King richrdkng@gmail.com (www.richrdkng.com)
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose
 * with or without fee is hereby granted, provided that the above copyright notice
 * and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD
 * TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS.
 * IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL
 * DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN
 * AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION
 * WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
/**
 * Additional options to change the default behavior.
 *
 * @typedef {Object} durationOptions
 *
 * @property {string} [unit=ms] - The unit in which the returned duration will be converted to.
 *
 *   By default, the returned duration will be in milliseconds (`'ms'`).
 *   Possible units are the same as for the durations to parse (from milliseconds to weeks).
 *
 * @property {boolean} [round=true] - If true, the returned duration will be rounded. By default, it's `true`.
 *
 * @example <caption>Duration Options</caption>
 * // without fallback
 * duration('42 sec', { unit: 'sec', round: false })
 *
 * // with fallback
 * duration('42 sec', '1 sec', { unit: 'sec', round: false })
 */
/**
 * Converts different types of string durations to milliseconds, seconds, minutes, and more as numbers.
 *
 * @function duration
 *
 * @param {string|number|*} [duration] - The duration(s) to parse.
 *
 *   Multiple durations are allowed in the string separated by spaces and/or commas.
 *
 *   Valid duration units: **weeks**, **days**, **hours**, **minutes**, **seconds**, and **milliseconds**.
 *   Possible duration unit variations:
 *
 *   - milliseconds: `'ms'`, `'millisecond'`, `'milliseconds'`
 *   - seconds:      `'s'`,  `'sec'`,         `'second'`,      `'seconds'`
 *   - minutes:      `'m'`,  `'min'`,         `'minute'`,      `'minutes'`
 *   - hours:        `'h'`,  `'hour'`,        `'hours'`
 *   - days:         `'d'`,  `'day'`,         `'days'`
 *   - weeks:        `'w'`,  `'week'`,        `'weeks'`
 *
 * @param {string|number|durationOptions} [defaultOrOptions] - The default duration as a fallback or additional options.
 *
 *   If unspecified, the default fallback duration is 0 (zero).
 *
 * @param {durationOptions} [options] - Additional options to change the default behavior.
 *
 * @example <caption>General Usage</caption>
 * // these will return milliseconds
 * duration('3.5h') // === 12600000
 * duration('1.5h') // === 5400000
 * duration('175min') // === 10500000
 * duration('300ms') // === 300
 *
 * @example <caption>Unit Varieties</caption>
 * // singulars, plurals, and shorthands work as expected
 * duration('2s') // === 2000
 * duration('2sec') // === 2000
 * duration('2second') // === 2000
 * duration('2seconds') // === 2000
 * duration('2 second') // === 2000
 * duration('2 seconds') // === 2000
 *
 * @example <caption>Whitespaces</caption>
 * // whitespaces don't matter
 * duration('42 sec') // === 42000
 * duration(' 42sec') // === 42000
 * duration('42sec ') // === 42000
 * duration('   42   sec   ') // === 42000
 *
 * @example <caption>Separators</caption>
 * // commas, underscores, and dashes are allowed
 * duration('10000 sec') // === 10000000
 * duration('10,000 sec') // === 10000000
 * duration('10_000 sec') // === 10000000
 * duration('10-000 sec') // === 10000000
 *
 * @example <caption>Unit Tolerance</caption>
 * // multiple units are allowed too, even the crazier ones
 * duration('1 hour 23 minutes 45 seconds 600 milliseconds') // === 5025600
 * duration('100ms 200ms') // === 300
 * duration('500ms 400ms 300ms 200ms 100ms') // === 1500
 * duration('1s 2sec 3secs 4second 5seconds') // === 15000
 * duration('1.1h 2.2h 3.3h 4.4h 5.5h') // === 59400000
 * duration('0.5d 1.0day 1.5day 2.0days') // === 432000000
 *
 * @example <caption>Custom Fallback</caption>
 * // these will return the fallback duration
 * duration(undefined, '1 hour') // === 3600000
 * duration(null, '45 min') // === 2700000
 * duration(false, '60sec') // === 60000
 *
 * @example <caption>Custom Return Unit</caption>
 * // 1 hour in seconds
 * duration('1 h', { unit: 's' }) // === 3600
 *
 * // 2 days in minutes
 * duration('2 days', { unit: 'minutes' }) // === 2880
 *
 * // 3 weeks, 5 days and 12 hours in hours
 * duration('3w 5days 12 h', { unit: 'h' }) // === 636
 *
 * @example <caption>CommonJS Require</caption>
 * const duration = require('@standards/duration')
 *
 * duration('42 sec') // === 42000
 *
 * @example <caption>ES Module Import</caption>
 * import duration from '@standards/duration'
 *
 * duration('42 sec') // === 42000
 *
 * @returns {number} The duration in number.
 *                   If the given duration is invalid, the returned duration will be `0` *(zero)*.
 */
declare function duration(duration: any, defaultOrOptions?: any, options?: any): any;
/**
 * Creates a customized duration function with the given arguments.
 *
 * @see {@link @standards/duration~duration}
 * @function createCustom
 *
 * @param {string|number|*} [duration] - The duration(s) to parse.
 * @param {string|number|durationOptions} [defaultOrOptions] - The default duration as a fallback or additional options.
 * @param {durationOptions} [options] - Additional options to change the default behavior.
 *
 * @example <caption>CommonJS</caption>
 * const duration = require('@standards/duration')
 *
 * // custom duration function
 * // with 1 hour as a fallback, return unit is in seconds
 * const custom = duration.createCustom(null, '1 hour', { unit: 'sec' })
 *
 * @example <caption>ES Module</caption>
 * import { createCustom } from '@standards/duration'
 *
 * // custom duration function
 * // with 1 hour as a fallback, return unit is in seconds
 * const custom = createCustom(null, '1 hour', { unit: 'sec' })
 *
 * @example <caption>Custom Duration Function</caption>
 * // will return the fallback, which is "1 hour" in seconds ({ unit: 'sec' })
 * custom() // === 3600
 *
 * // will return 2 hours in seconds, since the return unit is "sec"
 * custom('2 hours') // === 7200
 *
 * @returns {duration} The customized duration function.
 */
declare function createCustom(duration_: any, defaultOrOptions: any, options: any): (dur: any, def: any, opt: any) => any;
export { createCustom };
export default duration;
