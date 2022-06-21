import chalk from "chalk";
function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
}
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel || (LogLevel = {}));
export const levels = {
    info: 1,
    warn: 2,
    error: 3,
    debug: 4,
};
const colors = {
    1: chalk.green,
    2: chalk.yellow,
    3: chalk.red,
    4: chalk.blue,
};
export default function ({ level, scope = undefined }, ...parts) {
    const loglevel = process.env.LOGLEVEL ?? LogLevel.ERROR;
    if (level <= loglevel) {
        const levelName = colors[level](getKeyByValue(levels, level));
        const d = new Date();
        const dt = chalk.cyan(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
        const msg = parts.join(" ");
        let out = `[${dt}][${levelName}]`;
        if (scope) {
            out += `[${chalk.yellow(scope)}]`;
        }
        out += ` ${msg}`;
        console.log(out);
    }
}
//# sourceMappingURL=logger.js.map