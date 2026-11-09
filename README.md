# Memoriza — catálogo de produtos

Dados e imagens do catálogo do site [Memoriza](https://github.com/sergio-ildefonso/memoriza), consumidos como submódulo na pasta `memoriza-catalogo/`.

## Estrutura

```
products.json      # lista de produtos
images/*           # imagens (SVG, PNG, JPEG, WebP), referenciadas pelo campo "image"
index.html         # catálogo com CRUD (dev server)
server/            # lógica da API que escreve products.json
src/main.js        # UI do catálogo
test/              # testes da API
```

## Formato

```json
{
  "name": "Placa de Nogueira",
  "description": "Placa em madeira de nogueira gravada a laser, ideal para homenagens.",
  "material": "Madeira",
  "tipo": "Placa",
  "tamanho": "Médio",
  "image": "images/placa-nogueira.svg"
}
```

| Campo | Uso |
|---|---|
| `name` | título do card + `alt` da imagem |
| `description` | texto do card |
| `material`, `tipo`, `tamanho` | categorias dos filtros |
| `image` | caminho da imagem, relativo à raiz deste repositório |

## Editar

A forma recomendada é pela UI:

```sh
npm install
npm run dev   # http://localhost:5173
```

O botão "Novo produto" cria; cada card tem "Editar" e "Apagar". No formulário podes
escolher um ficheiro (PNG, JPEG ou WebP, até 5 MB) que é gravado em `images/`, ou
indicar o caminho à mão. SVG não é aceite como upload (pode conter script).
A API (`/api/products`, `/api/images`) escreve diretamente em `products.json` e `images/`.
Isto só existe no dev server — o `vite build` é estático e mostra apenas o catálogo
em só-leitura. Apagar um produto não apaga a imagem.

Também podes editar à mão:

1. Altera `products.json` e/ou `images/`.
2. Faz commit e push para `main`.
3. No site, atualiza o ponteiro do submódulo e faz push:

```sh
cd memoriza
git submodule update --remote memoriza-catalogo
git commit -am "chore: atualizar catálogo" && git push
```

As categorias dos filtros são derivadas do próprio JSON — não há listas para manter em paralelo. Adicionar um campo novo exige também atualizar o tipo `Product` em `src/App.tsx` do site.

## Notas

- As imagens atuais são placeholders SVG; substitui por fotos (`.jpg`, `.png`, `.webp`, `.svg`) e atualiza o campo `image`.
- Este repositório é público para que o build do site na Vercel consiga clonar o submódulo sem credenciais.
