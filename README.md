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
  createClassRouter,
} from 'trpc-routing-controllers';

@Router('users')
class UsersController {
  @Query('hello')
  @UseZod(z.object({ name: z.string() }))
  hello(@Input() input: { name: string }) {
    return `hello ${input.name}`;
  }
}

const t = initTRPC.context().create();
const { router } = createClassRouter({
  t,
  controllers: [new UsersController()],
});
```

## Examples

See the [tests](./tests) directory for more examples.

## License

[MIT](./LICENSE)
