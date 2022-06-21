import chalk, { ChalkInstance } from "chalk";

function getKeyByValue(object: object, value: any) {
  return Object.keys(object).find((key) => object[key] === value);
}

export enum LogLevel {
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  DEBUG = 4,
}

export const levels: { [key: string]: number } = {
  info: 1,
  warn: 2,
  error: 3,
  debug: 4,
};

const colors: { [level: number]: ChalkInstance } = {
  1: chalk.green,
  2: chalk.yellow,
  3: chalk.red,
  4: chalk.blue,
};

export default function ({ level, scope = undefined }: { level: LogLevel, scope?: string }, ...parts: any[]) {
  const loglevel = process.env.LOGLEVEL ?? LogLevel.ERROR;
  if (level <= loglevel) {
    const levelName = colors[level](getKeyByValue(levels, level));
    const d = new Date();
    const dt = chalk.cyan(`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`);
    const msg = parts.join(" ");
    let out = `[${dt}][${levelName}]`;
    if (scope) {
      out += `[${chalk.yellow(scope)}]`;
    }
    out += ` ${msg}`
    console.log(out);
  }
}
