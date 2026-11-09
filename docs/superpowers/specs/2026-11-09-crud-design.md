# CRUD do catálogo — design

**Data:** 2026-11-09
**Estado:** proposto

## Intenção
Editar o catálogo (criar, ver, editar, apagar produtos) numa UI, com as alterações
escritas em `products.json` por um servidor Node. O repo continua a ser a fonte de
dados consumida pelo site Memoriza via submódulo — o formato do JSON não muda.

## Objetivos
- GET/POST/PUT/DELETE de produtos via `/api/products`.
- UI vanilla JS: grelha de cards, botão "Novo produto", editar e apagar com confirmação.
- Alterações persistem em `products.json` (ficheiro real, não localStorage).
- Escrita atómica (temp file + rename) e serializada, para não corromper o ficheiro.
- Validação no servidor antes de gravar.

## Não-objetivos
- Upload de imagens (o campo `image` é um caminho para `images/*.svg`, escrito à mão).
- Autenticação, contas, edição concorrente multi-utilizador.
- Escrita em produção (Vercel é estático): CRUD existe só no dev server.
- Migrar para React/TypeScript/framework.

## Anti-objetivos
- Corromper `products.json` ou alterar o formato dos campos existentes.
- Deixar a página em branco quando a API não existe (build estático).

## Abordagem escolhida
Plugin Vite em `vite.config.js` que monta a API no dev server. Lógica em
`server/productsApi.js` (função pura sobre um caminho de ficheiro), para poder ser
testada com `node:test` sem subir servidor. Zero dependências novas.

## API
| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| GET | `/api/products` | — | 200 `Product[]` |
| POST | `/api/products` | `Product` sem `id` | 201 `Product` |
| PUT | `/api/products/:id` | `Product` | 200 `Product` |
| DELETE | `/api/products/:id` | — | 204 |

- `id`: inteiro, `max(id)+1` no POST; imutável no PUT.
- Validação: `name`, `description`, `image` strings não vazias; `material`, `tipo`,
  `tamanho` strings (podem ser vazias); `image` tem de começar por `images/` e não
  pode conter `..`. 400 com mensagem em caso de falha, 404 se o id não existir.

## UI
- `src/main.js`: carrega de `/api/products`; se falhar, usa o JSON importado e
  esconde os botões de escrita (modo só-leitura).
- Formulário num `<dialog>` nativo com os seis campos; `confirm()` no apagar.
- Sem framework, sem CSS extra além do já existente.

## Ficheiros
- `server/productsApi.js` (novo): leitura, validação e escrita do JSON.
- `vite.config.js` (novo): middleware `/api/products` por cima da lógica acima.
- `src/main.js`: render + form + chamadas à API.
- `index.html`: botão "Novo produto", `<dialog>` do formulário, estilos mínimos.
- `test/productsApi.test.js` (novo): CRUD contra ficheiro temporário.
- `src/api.js`, `src/App.jsx`, `src/server.js`, `src/data.ts`: removidos (código morto
  que duplica esta responsabilidade e não é usado por nada).

## Decisões deixadas ao construtor
- Estrutura exata do HTML do dialog e dos handlers.
- Estratégia de serialização das escritas (fila de promessas).
