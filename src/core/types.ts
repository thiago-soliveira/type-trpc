import { z } from 'zod';

export type TRPCContext = unknown;

export type Middleware = (opts: {
  type: 'query' | 'mutation' | 'subscription';
  path: string;
  ctx: TRPCContext;
  input: unknown;
  next: () => Promise<unknown>;
}) => Promise<unknown>;

export type AuthGuard = (ctx: TRPCContext) => boolean | Promise<boolean>;

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
