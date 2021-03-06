const isProduction = process.env.NODE_ENV === "production";
const prefix = "Invariant failed";
export function invariant(condition, message) {
    if (condition)
        return;
    if (isProduction)
        throw new Error(prefix);
    const provided = typeof message === "function" ? message() : message;
    const out = provided ? `${prefix}: ${provided}` : prefix;
    throw new Error(out);
}
export async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
export function int(val, fallback) {
    if (val) {
        const p = parseInt(val);
        if (isNaN(p))
            return fallback;
        else
            return p;
    }
    return fallback;
}
// 100% from https://github.com/nkcmr/bool
export function bool(val, fallback) {
    if (typeof val === "boolean")
        return val;
    if (typeof val === "string") {
        if (/^(true|false)$/i.test(val)) {
            return val.toLowerCase() === "true";
        }
        if (/^(0|1)$/.test(val)) {
            return val === "1";
        }
        if (/^(y|n)$/i.test(val)) {
            return val.toLowerCase() === "y";
        }
        if (/^(yes|no)$/i.test(val)) {
            return val.toLowerCase() === "yes";
        }
    }
    if (typeof val === "number") {
        if (val === -1) {
            return false;
        }
        return !!val;
    }
    if (Array.isArray(val)) {
        return val.length > 0;
    }
    if (typeof val === "object") {
        return Object.keys(val).length > 0;
    }
    return !!val;
}
//# sourceMappingURL=utils.js.map