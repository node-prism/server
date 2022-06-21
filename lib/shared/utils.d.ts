export declare function invariant(condition: any, message?: string | (() => string)): asserts condition;
export declare function sleep(ms: number): Promise<void>;
export declare function int(val: string | undefined, fallback: number): number;
export declare function bool(val: string | undefined, fallback: boolean): boolean;
