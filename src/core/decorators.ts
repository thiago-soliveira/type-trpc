import type { z } from 'zod';
import {
  addParamMetadata,
  getMethodMetadata,
  getRouterMetadata,
  setMethodMetadata,
  setRouterMetadata,
} from './metadata';
import type { Middleware, ProcedureOptions, AuthGuard, RateLimitOptions } from './types';

function mergeArrays<T>(...arrays: (T[] | undefined)[]): T[] | undefined {
  const result = arrays.filter(Boolean).flat() as T[];
  return result.length ? result : undefined;
}

export function Router(base?: string, opts?: { middlewares?: Middleware[]; meta?: Record<string, any>; auth?: AuthGuard | AuthGuard[]; rateLimit?: RateLimitOptions }) {
  return function (target: Function) {
    const prev = getRouterMetadata(target);
    const authArr = opts?.auth ? (Array.isArray(opts.auth) ? opts.auth : [opts.auth]) : undefined;
    setRouterMetadata(target, {
      ...prev,
      base,
      middlewares: mergeArrays(prev.middlewares, opts?.middlewares),
      meta: { ...prev.meta, ...opts?.meta },
      auth: mergeArrays(prev.auth, authArr),
      rateLimit: opts?.rateLimit ?? prev.rateLimit,
    });
  };
}

export function UseMiddlewares(...middlewares: Middleware[]) {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey) {
      const meta = getMethodMetadata(target, propertyKey) || { type: 'query' };
      meta.middlewares = mergeArrays(meta.middlewares, middlewares);
      setMethodMetadata(target, propertyKey, meta);
    } else {
      const meta = getRouterMetadata(target);
      meta.middlewares = mergeArrays(meta.middlewares, middlewares);
      setRouterMetadata(target, meta);
    }
  };
}

function procedureDecorator(type: 'query' | 'mutation' | 'subscription') {
  return function (name?: string, opts?: ProcedureOptions) {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const meta = getMethodMetadata(target, propertyKey) || { type };
      meta.type = type;
      meta.name = name;
      if (opts?.input) meta.input = opts.input;
      if (opts?.output) meta.output = opts.output;
      meta.middlewares = mergeArrays(meta.middlewares, opts?.middlewares);
      if (opts?.meta) meta.meta = { ...meta.meta, ...opts.meta };
      if (opts?.deprecated !== undefined) meta.deprecated = opts.deprecated;
      if (opts?.rateLimit) meta.rateLimit = opts.rateLimit;
      if (opts?.auth) meta.auth = mergeArrays(meta.auth, Array.isArray(opts.auth) ? opts.auth : [opts.auth]);
      setMethodMetadata(target, propertyKey, meta);
      return descriptor;
    };
  };
}

export const Query = procedureDecorator('query');
export const Mutation = procedureDecorator('mutation');
export const Subscription = procedureDecorator('subscription');

export function UseZod(input?: z.ZodTypeAny, output?: z.ZodTypeAny) {
  return function (target: any, propertyKey: string | symbol) {
    const meta = getMethodMetadata(target, propertyKey) || { type: 'query' };
    if (input) meta.input = input;
    if (output) meta.output = output;
    setMethodMetadata(target, propertyKey, meta);
  };
}

export function Ctx() {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'ctx' });
  };
}

export function Input() {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    addParamMetadata(target, propertyKey, { index: parameterIndex, type: 'input' });
  };
}

export function Auth(guard: AuthGuard) {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey) {
      const meta = getMethodMetadata(target, propertyKey) || { type: 'query' };
      meta.auth = mergeArrays(meta.auth, [guard]);
      setMethodMetadata(target, propertyKey, meta);
    } else {
      const meta = getRouterMetadata(target);
      meta.auth = mergeArrays(meta.auth, [guard]);
      setRouterMetadata(target, meta);
    }
  };
}

export function Meta(meta: Record<string, any>) {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey) {
      const m = getMethodMetadata(target, propertyKey) || { type: 'query' };
      m.meta = { ...m.meta, ...meta };
      setMethodMetadata(target, propertyKey, m);
    } else {
      const m = getRouterMetadata(target);
      m.meta = { ...m.meta, ...meta };
      setRouterMetadata(target, m);
    }
  };
}

export function Deprecated(message?: string) {
  return function (target: any, propertyKey: string | symbol) {
    const meta = getMethodMetadata(target, propertyKey) || { type: 'query' };
    meta.deprecated = message || true;
    setMethodMetadata(target, propertyKey, meta);
  };
}

export function RateLimit(opts: RateLimitOptions) {
  return function (target: any, propertyKey?: string | symbol) {
    if (propertyKey) {
      const meta = getMethodMetadata(target, propertyKey) || { type: 'query' };
      meta.rateLimit = opts;
      setMethodMetadata(target, propertyKey, meta);
    } else {
      const meta = getRouterMetadata(target);
      meta.rateLimit = opts;
      setRouterMetadata(target, meta);
    }
  };
}
