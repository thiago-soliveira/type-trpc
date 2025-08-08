import type { initTRPC } from '@trpc/server';
import type { z } from 'zod';
import {
  getMethodMetadata,
  getParamMetadata,
  getRouterMetadata,
  MethodMetadata,
} from './metadata';
import type { Middleware, ProcedureOptions, TRPCContext, AuthGuard } from './types';
import { createRateLimitMiddleware } from './rateLimit';

export interface CreateClassRouterOptions {
  t: ReturnType<typeof initTRPC.context<TRPCContext>['create']>;
  controllers: any[];
  /** Global middlewares applied before class/method middlewares */
  middlewares?: Middleware[];
  /** Map of base procedures available via the {@link UseBase} decorator */
  baseProcedures?: Record<string, any>;
}

function toCamel(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function authMiddleware(guards: AuthGuard[]): Middleware {
  return async ({ ctx, next }) => {
    for (const g of guards) {
      const ok = await g(ctx);
      if (!ok) {
        throw new Error('UNAUTHORIZED');
      }
    }
    return next();
  };
}

export function createClassRouter(options: CreateClassRouterOptions) {
  const { t, controllers, middlewares: globalMiddlewares = [], baseProcedures = {} } = options;
  const rootProcedures: Record<string, any> = {};

  for (const controller of controllers) {
    const ctor = controller.constructor;
    const classMeta = getRouterMetadata(ctor);
    const base = classMeta.base ?? toCamel(ctor.name);

    const procedures: Record<string, any> = {};
    const proto = Object.getPrototypeOf(controller);
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') continue;
      const meta = getMethodMetadata(proto, key) as MethodMetadata | undefined;
      if (!meta) continue;
      const name = meta.name ?? key;
      const baseName = meta.baseProcedure ?? classMeta.baseProcedure;
      let proc = baseName ? baseProcedures[baseName] || t.procedure : t.procedure;

      const combinedMiddlewares: Middleware[] = [];
      if (globalMiddlewares) combinedMiddlewares.push(...globalMiddlewares);
      if (classMeta.middlewares) combinedMiddlewares.push(...classMeta.middlewares);
      if (meta.middlewares) combinedMiddlewares.push(...meta.middlewares);
      if (classMeta.auth) combinedMiddlewares.push(authMiddleware(classMeta.auth));
      if (meta.auth) combinedMiddlewares.push(authMiddleware(meta.auth));
      if (classMeta.rateLimit) combinedMiddlewares.push(createRateLimitMiddleware(classMeta.rateLimit));
      if (meta.rateLimit) combinedMiddlewares.push(createRateLimitMiddleware(meta.rateLimit));
      for (const mw of combinedMiddlewares) {
        proc = proc.use(mw);
      }
      if (classMeta.meta) proc = proc.meta(classMeta.meta);
      if (meta.meta) proc = proc.meta(meta.meta);
      if (meta.deprecated) proc = proc.meta({ deprecated: meta.deprecated });
      if (meta.input) proc = proc.input(meta.input as z.ZodTypeAny);
      if (meta.output) proc = proc.output(meta.output as z.ZodTypeAny);

      const paramMeta = getParamMetadata(proto, key);
      const handler = async (opts: { ctx: any; input: any }) => {
        const args: any[] = [];
        for (const p of paramMeta) {
          args[p.index] = p.type === 'ctx' ? opts.ctx : opts.input;
        }
        return (controller as any)[key](...args);
      };

      if (meta.type === 'mutation') {
        procedures[name] = proc.mutation(handler);
      } else if (meta.type === 'subscription') {
        procedures[name] = proc.subscription(handler as any);
      } else {
        procedures[name] = proc.query(handler);
      }
    }

    if (!rootProcedures[base]) {
      rootProcedures[base] = t.router(procedures);
    } else {
      rootProcedures[base] = t.mergeRouters(rootProcedures[base], t.router(procedures));
    }
  }

  const router = t.router(rootProcedures);
  return { router };
}
