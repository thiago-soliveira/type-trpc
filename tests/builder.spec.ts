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
  Auth,
  UseMiddlewares,
  createClassRouter,
} from '../src';

interface CtxType {
  user?: { id: string };
}

const t = initTRPC.context<CtxType>().create();

@Router('users')
@UseMiddlewares(async ({ next }) => next())
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }))
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }

  @Mutation('add', { auth: (ctx) => !!ctx.user })
  @UseZod(z.object({ id: z.string() }))
  add(@Ctx() ctx: CtxType, @Input() input: { id: string }) {
    return { id: input.id, user: ctx.user?.id };
  }
}

describe('createClassRouter', () => {
  const { router } = createClassRouter({ t, controllers: [new UsersController()] });
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

  it('runs auth guard', async () => {
    const caller = router.createCaller({ user: { id: '1' } });
    const res = await caller.users.add({ id: 'x' });
    expect(res.user).toBe('1');
    const caller2 = router.createCaller({});
    await expect(caller2.users.add({ id: 'x' })).rejects.toBeTruthy();
  });
});
