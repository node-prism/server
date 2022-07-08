# useCache

`useCache(callback, inputs, cacheDuration)`

This cache helper accepts a callback, some inputs that are used as the cache key,
and a `cacheDuration` like "1m", "30s", etc.

The operation is stored in a `CacheMap` where the map key is
the stringified inputs and the value is the result of `callback(...inputs)`.

Until the lifetime defined by `cacheDuration` has passed,
the cached result of the callback will be returned by the call to `useCache`.

A usage example of this might be a middleware that caches the JWT signature
verification result using the client IP and the JWT as the cache key:

```typescript
// ip-jwt-verification-middleware.ts

export default async function(c: Context, { bearer }: { bearer: string }) {
  if (!bearer) {
    return Respond.BadRequest(c, "Expected Bearer token.");
  }

  const inputs = [c.req.ip, bearer];

  const outputs = useCache(
    (_ip: string, token: string | undefined) => {
      const result = verify(token, process.env.JWT_SIGNATURE, { exp: true });

      if (!result.sig) return { valid: false, reason: "signature" };
      if (result.exp) return { valid: false, reason: "expired" };

      return { valid: true };
    },
    inputs,
    "1m"
  );

  if (outputs.valid) {
    c.next();
    return;
  }

  return Respond.Unauthorized(c, { [outputs.reason]: true });
}
```
