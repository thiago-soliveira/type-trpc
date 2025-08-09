import type { z } from 'zod';
import {
  getMethodMetadata,
  getParamMetadata,
  getRouterMetadata,
  MethodMetadata,
} from './metadata';
import type { Middleware, AuthGuard } from './types';
import { createRateLimitMiddleware } from './rateLimit';
import { TRPCError } from '@trpc/server';

import type {
  AnyRouter,
  AnyTRPCRootTypes as AnyRootTypes,
  TRPCBuiltRouter as BuiltRouter,
  TRPCRouterRecord as RouterRecord,
  TRPCRouterBuilder as RouterBuilder,
  TRPCProcedureBuilder as ProcedureBuilder,
} from '@trpc/server';

export interface CreateClassRouterOptions<TRoot extends AnyRootTypes> {
  t: {
    router: RouterBuilder<TRoot>;
    mergeRouters: (...routers: AnyRouter[]) => AnyRouter;
    procedure: ProcedureBuilder<any, any, any, any, any, any, any, any>;
  };
  controllers: any[];
  /** Global middlewares applied before class/method middlewares */
  middlewares?: Middleware[];
  /** Map of base procedures available via the {@link UseBase} decorator */
  baseProcedures?: Record<string, any>;
}

export type ClassRouter<TRoot extends AnyRootTypes> = {
  router: BuiltRouter<TRoot, RouterRecord>;
};

function toCamel(str: string) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function authMiddleware(guards: AuthGuard[]): Middleware {
  return async ({ ctx, next }) => {
    for (const g of guards) {
      const ok = await g(ctx);
      if (ok !== true) {
        const code = ok === 'FORBIDDEN' ? 'FORBIDDEN' : 'UNAUTHORIZED';
        throw new TRPCError({ code });
      }
    }
    return next();
  };
}

export function createClassRouter<TRoot extends AnyRootTypes>(
  options: CreateClassRouterOptions<TRoot>,
): ClassRouter<TRoot> {
  const { t, controllers, middlewares: globalMiddlewares = [], baseProcedures = {} } = options;
  const rootProcedures: Record<string, AnyRouter> = {};

  for (const controller of controllers) {
    const ctor = controller.constructor;
    const classMeta = getRouterMetadata(ctor);
    const base = classMeta.base ?? toCamel(ctor.name);

    const procedures: RouterRecord = {};
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
      const handler = (opts: { ctx: any; input: any }) => {
        const args: any[] = [];
        for (const p of paramMeta) {
          args[p.index] = p.type === 'ctx' ? opts.ctx : opts.input;
        }
        return (controller as any)[key](...args);
      };

      if (meta.type === 'mutation') {
        procedures[name] = proc.mutation(handler);
      } else if (meta.type === 'subscription') {
        procedures[name] = proc.subscription(handler);
      } else {
        procedures[name] = proc.query(handler);
      }
    }

    if (!rootProcedures[base]) {
      rootProcedures[base] = t.router(procedures);
    } else {
      rootProcedures[base] = t.mergeRouters(
        rootProcedures[base]!,
        t.router(procedures),
      );
    }
  }

  const router = t.router(rootProcedures);
  return { router };
}
