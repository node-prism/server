const isProduction = process.env.NODE_ENV === "production";
const prefix = "Invariant failed";

export function invariant(
  condition: any,
  message?: string | (() => string)
): asserts condition {
  if (condition) return;
  if (isProduction) throw new Error(prefix);
  const provided: string | undefined =
    typeof message === "function" ? message() : message;
  const out = provided ? `${prefix}: ${provided}` : prefix;
  throw new Error(out);
}

export async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
