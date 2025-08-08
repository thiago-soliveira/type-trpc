# type-trpc

Decorators and class-based routing for tRPC v10.

## Installation

```bash
npm install type-trpc reflect-metadata
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
} from 'type-trpc';

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

## Publishing

To publish a new version to npm:

1. Generate an [npm automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) and add it to the repository secrets as `NPM_TOKEN`.
2. Bump the package version locally using `npm version patch|minor|major` and update `CHANGELOG.md` if needed.
3. Push commits and tags: `git push --follow-tags`.
4. Create a GitHub Release with tag `vX.Y.Z` matching the version in `package.json`.
5. The release workflow will build the project, verify the version and publish to npm with provenance. Pre-releases (e.g. `v1.0.0-rc.1`) are published under the `next` tag.

The workflow requires the `id-token: write` permission to enable npm provenance during `npm publish`.

