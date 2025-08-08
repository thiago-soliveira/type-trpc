# trpc-routing-controllers

Decorators and class-based routing for tRPC v10.

## Installation

```bash
npm install trpc-routing-controllers reflect-metadata
```

## Quick Start

```ts
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import {
  Router,
  Query,
  Mutation,
  Ctx,
  Input,
  UseZod,
  UseBase,
  createClassRouter,
} from 'trpc-routing-controllers';

@Router('users')
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }))
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }

  @Mutation('add')
  @UseBase('protected')
  @UseZod(z.object({ id: z.string() }))
  add(@Ctx() ctx: any, @Input() input: { id: string }) {
    return { id: input.id, user: ctx.user?.id };
  }
}

const t = initTRPC.context().create();
const { router } = createClassRouter({
  t,
  controllers: [new UsersController()],
  // register base procedures
  baseProcedures: {
    public: t.procedure,
    protected: t.procedure.use(({ ctx, next }) => {
      if (!ctx.user) throw new Error('UNAUTHORIZED');
      return next();
    }),
  },
});
```

## Examples

See the [tests](./tests) directory for more examples.

### Base procedures

You can register named base procedures and reference them with `@UseBase` at the class or method level. This is handy for defining
`public`/`protected` defaults.

```ts
const protectedProc = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new Error('UNAUTHORIZED');
  return next();
});

const { router } = createClassRouter({
  t,
  controllers: [new UsersController()],
  baseProcedures: { public: t.procedure, protected: protectedProc },
});

@Router('users')
@UseBase('public')
class UsersController {
  @Query('hello')
  hello() { return 'hi'; }

  @Mutation('add')
  @UseBase('protected')
  add(@Ctx() ctx: CtxType) { return { user: ctx.user!.id }; }
}
```

Global middlewares can also be supplied via `createClassRouter({ middlewares: [...] })` and run before class and method middlewares.

## License

[MIT](./LICENSE)
