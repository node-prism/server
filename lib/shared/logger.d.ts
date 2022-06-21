export declare enum LogLevel {
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    DEBUG = 4
}
export declare const levels: {
    [key: string]: number;
};
export default function ({ level, scope }: {
    level: LogLevel;
    scope?: string;
}, ...parts: any[]): void;
