import { readFile, writeFile, rename } from 'node:fs/promises';

const STRINGS = ['name', 'description', 'material', 'tipo', 'tamanho', 'image'];
const REQUIRED = ['name', 'description', 'image'];

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validate(data) {
  const product = {};
  for (const key of STRINGS) {
    const value = data?.[key] ?? '';
    if (typeof value !== 'string') throw fail(400, `${key} deve ser texto`);
    product[key] = value;
  }
  for (const key of REQUIRED) {
    if (!product[key].trim()) throw fail(400, `${key} é obrigatório`);
  }
  if (!product.image.startsWith('images/') || product.image.includes('..')) {
    throw fail(400, 'image deve ser um caminho dentro de images/');
  }
  return product;
}

export function createProductsApi(filePath) {
  let queue = Promise.resolve();

  async function read() {
    let raw;
    try {
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') throw fail(500, 'products.json não existe');
      throw fail(500, 'Não foi possível ler products.json');
    }
    try {
      const products = JSON.parse(raw);
      if (!Array.isArray(products)) throw new Error();
      return products;
    } catch {
      throw fail(500, 'products.json não contém uma lista válida');
    }
  }

  async function write(products) {
    const tmp = `${filePath}.tmp`;
    try {
      await writeFile(tmp, `${JSON.stringify(products, null, 2)}\n`);
      await rename(tmp, filePath);
    } catch {
      throw fail(500, 'Não foi possível gravar products.json');
    }
  }

  // Writes go through one promise chain so read-modify-write never interleaves.
  function serial(work) {
    const run = queue.then(work, work);
    queue = run.catch(() => {});
    return run;
  }

  return {
    list: read,

    create: data => serial(async () => {
      const products = await read();
      const id = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
      const product = { id, ...validate(data) };
      products.push(product);
      await write(products);
      return product;
    }),

    update: (id, data) => serial(async () => {
      const products = await read();
      const index = products.findIndex(p => p.id === Number(id));
      if (index === -1) throw fail(404, 'Produto não encontrado');
      const product = { id: products[index].id, ...validate(data) };
      products[index] = product;
      await write(products);
      return product;
    }),

    remove: id => serial(async () => {
      const products = await read();
      const index = products.findIndex(p => p.id === Number(id));
      if (index === -1) throw fail(404, 'Produto não encontrado');
      products.splice(index, 1);
      await write(products);
    }),
  };
}
