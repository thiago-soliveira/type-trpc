# trpc-routing-controllers

A tiny experiment that brings class-based routers and decorators to tRPC v10.

```ts
import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import { Router, Query, Mutation, Ctx, Input, UseZod, createClassRouter } from 'trpc-routing-controllers';

@Router('users')
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }))
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }
}

const t = initTRPC.context().create();
const { router } = createClassRouter({ t, controllers: [new UsersController()] });
```
