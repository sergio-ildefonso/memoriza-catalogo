# Upload de imagem — adenda ao design de 2026-11-09

**Estado:** proposto
**Contexto:** `docs/superpowers/specs/2026-11-09-crud-design.md`

## Intenção
No formulário de produto, poder escolher um ficheiro de imagem; o servidor grava-o
em `images/` e o campo `image` do produto fica com o caminho devolvido.

## Abordagem
Sem multipart e sem dependências: `PUT /api/images/<nome>` com os bytes crus no corpo
(`Content-Type` ignorado para efeitos de decisão). O servidor deteta o formato pelos
magic bytes, gera o nome e devolve `{ "path": "images/<nome>.<ext>" }`.

## Formatos aceites
Apenas raster: PNG, JPEG, WebP. **SVG é rejeitado** (pode conter script e é servido na
mesma origem; os SVG já existentes no repo continuam a funcionar, só não são aceites
como upload). Limite: 5 MB.

## Nome do ficheiro
Base vem do nome original: minúsculas, `[a-z0-9]` mantidos, resto → `-`, colapsar e
aparar `-`, máx. 40 chars, fallback `imagem`. Extensão vem do formato detetado.
Se existir, acrescenta `-2`, `-3`, … Pasta fixa `images/`, sem subpastas por produto.

## Validação (servidor)
- Tamanho > 5 MB → 413.
- Magic bytes fora de PNG/JPEG/WebP → 400.
- Nome sanitizado nunca contém `/`, `\` ou `..` (a base é reconstruída, não copiada).
- Erro de escrita → 500.

## UI
- No `<dialog>`, input `type="file"` com `accept="image/png,image/jpeg,image/webp"`.
- Ao submeter: se há ficheiro, faz upload primeiro e usa o `path` devolvido no corpo do
  produto; se não há, mantém o caminho atual (edição) ou exige o campo (criação).
- Campo de texto `image` mantém-se editável como alternativa.
- Apagar produto **não** apaga a imagem.

## Ficheiros
- `server/imagesApi.js` (novo): `saveImage(dir, originalName, buffer)` → `Promise<string>`.
- `vite.config.js`: rota `PUT /api/images/:name` (corpo binário, limite 5 MB).
- `index.html` + `src/main.js`: input de ficheiro e upload no submit.
- `test/imagesApi.test.js` (novo): deteção de formato, rejeição, sanitização, colisões.
- `README.md`: mencionar upload.

## Não-objetivos
Recortar/redimensionar, galeria múltipla, apagar imagens órfãs, uploads em produção.
