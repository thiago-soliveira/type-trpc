# Migration v10 → v11

This release upgrades the decorators to support tRPC v11.

## Breaking changes

- **tRPC v11** is now required. Update `@trpc/server` and `zod` to the versions listed in `peerDependencies`.
- Requires **Node.js >=18** and **TypeScript >=5.9**.
- Guards now throw `TRPCError` codes (`UNAUTHORIZED`, `FORBIDDEN`). Guard functions may return one of these codes to signal failure.
- Rate limiting middleware now throws `TRPCError` with `TOO_MANY_REQUESTS`.

## Migration steps

1. Update dependencies:
   ```bash
   npm install @trpc/server@^11 zod@^3 typescript@^5.9
   ```
2. Replace custom `Error` throws with `TRPCError` where appropriate.
3. When using `@Auth`, return `"UNAUTHORIZED"` or `"FORBIDDEN"` from guard functions to control the error code.
4. Configure `transformer` and `errorFormatter` via `initTRPC.create({ transformer, errorFormatter })` and pass the `t` instance to `createClassRouter`.
5. Use the updated `@RateLimit` decorator which now signals `TOO_MANY_REQUESTS`.

The public decorator API remains the same; most projects only need dependency updates and to adjust guard implementations.
