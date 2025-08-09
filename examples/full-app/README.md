# Full tRPC Decorators App

Exemplo completo usando a biblioteca de decorators para tRPC.

## Instalação

```bash
cd examples/full-app
npm i
```

## Scripts

- `npm run dev` – inicia o servidor em modo desenvolvimento com tsx.
- `npm run build` – compila para `dist/` em ESM.
- `npm run start` – executa o build compilado.
- `npm run test` – roda os testes com Vitest.
- `npm run test:ci` – roda os testes no modo CI.
- `npm run typecheck` – checagem de tipos sem emitir arquivos.
- `npm run caller` – executa o cliente de exemplo com `createCaller`.

O servidor expõe a API tRPC em `http://localhost:3000/trpc`.

## Arquitetura

Os controllers usam decorators da biblioteca (importada de `../../dist`) para definir rotas, validações, middlewares e guards. O `createClassRouter` monta o router a partir das classes e o `createCaller` permite chamadas tipadas no server e cliente.
