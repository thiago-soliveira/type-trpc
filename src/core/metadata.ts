import 'reflect-metadata';
import type { AuthGuard, Middleware, ProcedureOptions, RateLimitOptions } from './types';
import { z } from 'zod';

export const CLASS_METADATA = Symbol('trpc:class');
export const METHOD_METADATA = Symbol('trpc:method');
export const PARAM_METADATA = Symbol('trpc:param');

export interface RouterMetadata {
  base?: string;
  middlewares?: Middleware[];
  meta?: Record<string, any>;
  auth?: AuthGuard[];
  rateLimit?: RateLimitOptions;
  /** Name of the base procedure to use for all methods unless overridden */
  baseProcedure?: string;
}

export interface MethodMetadata {
  type: 'query' | 'mutation' | 'subscription';
  name?: string;
  input?: z.ZodTypeAny;
  output?: z.ZodTypeAny;
  middlewares?: Middleware[];
  meta?: Record<string, any>;
  deprecated?: boolean | string;
  rateLimit?: RateLimitOptions;
  auth?: AuthGuard[];
  /** Name of the base procedure to use for this method */
  baseProcedure?: string;
}

export interface ParamMetadata {
  index: number;
  type: 'ctx' | 'input';
}

export function getRouterMetadata(target: Function): RouterMetadata {
  return Reflect.getMetadata(CLASS_METADATA, target) || {};
}

export function setRouterMetadata(target: Function, meta: RouterMetadata) {
  Reflect.defineMetadata(CLASS_METADATA, meta, target);
}

export function getMethodMetadata(target: any, propertyKey: string | symbol): MethodMetadata | undefined {
  return Reflect.getMetadata(METHOD_METADATA, target, propertyKey);
}

export function setMethodMetadata(target: any, propertyKey: string | symbol, meta: MethodMetadata) {
  Reflect.defineMetadata(METHOD_METADATA, meta, target, propertyKey);
}

export function getParamMetadata(target: any, propertyKey: string | symbol): ParamMetadata[] {
  return Reflect.getMetadata(PARAM_METADATA, target, propertyKey) || [];
}

export function addParamMetadata(target: any, propertyKey: string | symbol, meta: ParamMetadata) {
  const existing = getParamMetadata(target, propertyKey);
  existing.push(meta);
  Reflect.defineMetadata(PARAM_METADATA, existing, target, propertyKey);
}
