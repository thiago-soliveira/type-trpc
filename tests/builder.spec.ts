import { describe, it, expect } from 'vitest';
import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import {
  Router,
  Query,
  Mutation,
  Ctx,
  Input,
  UseZod,
  UseMiddlewares,
  UseBase,
  createClassRouter,
} from '../src';

interface CtxType {
  user?: { id: string };
}

const t = initTRPC.context<CtxType>().create();

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new Error('UNAUTHORIZED');
  }
  return next();
});

const order: string[] = [];

@Router('users')
@UseBase('public')
@UseMiddlewares(async ({ next }) => {
  order.push('class');
  return next();
})
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }))
  @UseMiddlewares(async ({ next }) => {
    order.push('method');
    return next();
  })
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }

  @Mutation('add')
  @UseBase('protected')
  @UseZod(z.object({ id: z.string() }))
  add(@Ctx() ctx: CtxType, @Input() input: { id: string }) {
    return { id: input.id, user: ctx.user?.id };
  }
}

describe('createClassRouter', () => {
  const globalMw = async ({ next }) => {
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
  it('executes query', async () => {
    const caller = router.createCaller({});
    const res = await caller.users.hello({ name: 'Alice' });
    expect(res).toBe('hello Alice');
  });

  it('fails zod validation', async () => {
    const caller = router.createCaller({});
    // @ts-expect-error
    await expect(caller.users.hello({ name: 1 })).rejects.toBeTruthy();
  });

  it('runs base procedure auth', async () => {
    const caller = router.createCaller({ user: { id: '1' } });
    const res = await caller.users.add({ id: 'x' });
    expect(res.user).toBe('1');
    const caller2 = router.createCaller({});
    await expect(caller2.users.add({ id: 'x' })).rejects.toBeTruthy();
  });

  it('orders middlewares correctly', async () => {
    const caller = router.createCaller({});
    order.length = 0;
    await caller.users.hello({ name: 'Bob' });
    expect(order).toEqual(['global', 'class', 'method']);
  });
});
