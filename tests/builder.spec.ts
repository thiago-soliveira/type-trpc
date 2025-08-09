import { describe, it, expect, expectTypeOf } from 'vitest';
import { initTRPC, TRPCError, type AnyRouter, inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import superjson from 'superjson';
import { z } from 'zod';
import {
  Router,
  Query,
  Mutation,
  Subscription,
  Ctx,
  Input,
  UseZod,
  UseMiddlewares,
  UseBase,
  Auth,
  RateLimit,
  createClassRouter,
  Middleware,
  AuthGuard,
  InferInput,
  InferOutput,
} from '../src';

interface CtxType {
  user?: { id: string; role?: string };
}

const t = initTRPC.context<CtxType>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return { ...shape, message: error.message };
  },
});

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next();
});

const order: string[] = [];

const isAuthed: AuthGuard = (ctx: CtxType) => (ctx.user ? true : 'UNAUTHORIZED');
const isAdmin: AuthGuard = (ctx: CtxType) => (ctx.user?.role === 'admin' ? true : 'FORBIDDEN');

@Router('users')
@UseBase('public')
@UseMiddlewares(async ({ next }) => {
  order.push('class');
  return next();
})
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }), z.string())
  @UseMiddlewares(async ({ next }) => {
    order.push('method');
    return next();
  })
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }

  @Query('bad')
  @UseZod(undefined, z.string())
  bad() {
    return 1 as any;
  }

  @Mutation('add')
  @UseBase('protected')
  @UseZod(z.object({ id: z.string() }), z.object({ id: z.string(), user: z.string().optional() }))
  add(@Ctx() ctx: CtxType, @Input() input: { id: string }): { id: string; user?: string } {
    return { id: input.id, user: ctx.user?.id };
  }

  @Query('admin')
  @Auth(isAdmin)
  @Auth(isAuthed)
  admin(@Ctx() ctx: CtxType) {
    return ctx.user!.id;
  }

  @Query('limited')
  @RateLimit({ points: 1, durationSec: 60 })
  limited() {
    return 'ok';
  }

  @Subscription('count')
  count() {
    return observable<number>((emit) => {
      emit.next(1);
      emit.complete();
      return () => void 0;
    });
  }
}

describe('createClassRouter', () => {
  const globalMw: Middleware = async ({ next }) => {
    order.push('global');
    return next();
  };
  const { router } = createClassRouter({
    t,
    controllers: [new UsersController()],
    middlewares: [globalMw],
    baseProcedures: {
      public: t.procedure,
      protected: protectedProcedure,
    },
  });

  it('validates input and output', async () => {
    const caller = router.createCaller({});
    const res = await caller.users.hello({ name: 'Alice' });
    expect(res).toBe('hello Alice');
    await expect(caller.users.hello({ name: 1 as any })).rejects.toBeTruthy();
    await expect(caller.users.bad()).rejects.toBeTruthy();
  });

  it('orders middlewares correctly', async () => {
    const caller = router.createCaller({});
    order.length = 0;
    await caller.users.hello({ name: 'Bob' });
    expect(order).toEqual(['global', 'class', 'method']);
  });

  it('runs guards', async () => {
    const callerNoUser = router.createCaller({});
    await expect(callerNoUser.users.admin()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const callerUser = router.createCaller({ user: { id: '1', role: 'user' } });
    await expect(callerUser.users.admin()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const callerAdmin = router.createCaller({ user: { id: '2', role: 'admin' } });
    await expect(callerAdmin.users.admin()).resolves.toBe('2');
  });

  it('enforces rate limiting', async () => {
    const caller = router.createCaller({});
    await expect(caller.users.limited()).resolves.toBe('ok');
    await expect(caller.users.limited()).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });

  it('handles subscriptions', async () => {
    const caller = router.createCaller({});
    const obs = await caller.users.count();
    const values: number[] = [];
    await new Promise<void>((resolve, reject) => {
      obs.subscribe({
        next(v: number) {
          values.push(v);
        },
        error: reject,
        complete: resolve,
      });
    });
    expect(values).toEqual([1]);
  });

  it('exposes transformer and errorFormatter', () => {
    expect(router._def._config.transformer).not.toBeUndefined();
    const formatted = router._def._config.errorFormatter({
      shape: { message: '', code: 'INTERNAL_SERVER_ERROR', data: {} } as any,
      error: new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'oops' }),
    });
    expect((formatted as any).message).toBe('oops');
  });

  it('infers types', () => {
    expectTypeOf<InferInput<UsersController, 'hello'>>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<InferOutput<UsersController, 'add'>>().toEqualTypeOf<{ id: string; user?: string | undefined }>();
  });

  it('returns a typed router', () => {
    expectTypeOf(router).toMatchTypeOf<AnyRouter>();
    expectTypeOf(router).not.toBeAny();
    type AppRouter = typeof router;
    type Inputs = inferRouterInputs<AppRouter>;
    type Outputs = inferRouterOutputs<AppRouter>;
    expectTypeOf<Inputs>().toBeObject();
    expectTypeOf<Outputs>().toBeObject();
  });
});
