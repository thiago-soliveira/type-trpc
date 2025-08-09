import { z } from 'zod';

export type TRPCContext = Record<string, unknown>;

export type Middleware = (opts: {
  type: 'query' | 'mutation' | 'subscription';
  path: string;
  ctx: TRPCContext;
  input: unknown;
  next: (opts?: { ctx?: TRPCContext; input?: unknown }) => Promise<unknown>;
}) => Promise<unknown>;

export type AuthGuard = (
  ctx: TRPCContext
) => boolean | 'UNAUTHORIZED' | 'FORBIDDEN' | Promise<boolean | 'UNAUTHORIZED' | 'FORBIDDEN'>;

export interface RateLimitOptions {
  key?: string;
  points: number;
  durationSec: number;
}

export interface ProcedureOptions {
  input?: z.ZodTypeAny;
  output?: z.ZodTypeAny;
  middlewares?: Middleware[];
  meta?: Record<string, any>;
  deprecated?: boolean | string;
  rateLimit?: RateLimitOptions;
  auth?: AuthGuard | AuthGuard[];
}

export type AppRouter = ReturnType<typeof import('./builder').createClassRouter>['router'];

export type InferInput<TClass, TMethod extends keyof TClass> = TClass[TMethod] extends (
  ...args: infer P
) => any
  ? P extends [any, infer I]
    ? I
    : P[0]
  : never;

export type InferOutput<TClass, TMethod extends keyof TClass> = TClass[TMethod] extends (
  ...args: any
) => Promise<infer R>
  ? R
  : TClass[TMethod] extends (...args: any) => infer R
  ? R
  : never;
