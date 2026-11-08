# Memoriza — catálogo de produtos

Dados e imagens do catálogo do site [Memoriza](https://github.com/sergio-ildefonso/memoriza), consumidos como submódulo na pasta `memoriza-catalogo/`.

## Estrutura

```
products.json      # lista de produtos
images/*.svg       # imagens, referenciadas pelo campo "image"
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
