import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createProductsApi } from '../server/productsApi.js';

const initial = [
  { id: 1, name: 'A', description: 'd', material: 'M', tipo: 'T', tamanho: 'P', image: 'images/a.svg' },
  { id: 3, name: 'B', description: 'd', material: 'M', tipo: 'T', tamanho: 'P', image: 'images/b.svg' },
];

async function makeApi(data = initial) {
  const dir = await mkdtemp(join(tmpdir(), 'products-api-'));
  const file = join(dir, 'products.json');
  await writeFile(file, JSON.stringify(data));
  return { api: createProductsApi(file), file };
}

const valid = { name: 'Novo', description: 'd', material: 'M', tipo: 'T', tamanho: 'P', image: 'images/c.svg' };

const hasStatus = status => err => err.status === status;

test('list devolve os produtos do ficheiro', async () => {
  const { api } = await makeApi();
  assert.deepEqual(await api.list(), initial);
});

test('list devolve 500 quando o ficheiro não existe (catalog em falta)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'products-api-'));
  const file = join(dir, 'products.json');
  const api = createProductsApi(file);
  await assert.rejects(api.list(), hasStatus(500));
  assert.equal(existsSync(file), false);
});

test('create com ficheiro em falta devolve 500 e não cria um catálogo novo', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'products-api-'));
  const file = join(dir, 'products.json');
  const api = createProductsApi(file);
  await assert.rejects(api.create(valid), hasStatus(500));
  assert.equal(existsSync(file), false);
});

test('create atribui max(id)+1 e persiste no ficheiro', async () => {
  const { api, file } = await makeApi();
  const created = await api.create(valid);
  assert.equal(created.id, 4);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 3);
  assert.deepEqual(saved.at(-1), created);
});

test('update altera campos e preserva o id', async () => {
  const { api, file } = await makeApi();
  const updated = await api.update(3, { ...valid, id: 999, name: 'Editado' });
  assert.equal(updated.id, 3);
  assert.equal(updated.name, 'Editado');
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.find(p => p.id === 3).name, 'Editado');
});

test('update de id inexistente devolve 404 sem alterar o ficheiro', async () => {
  const { api, file } = await makeApi();
  const before = await readFile(file, 'utf8');
  await assert.rejects(api.update(42, valid), hasStatus(404));
  assert.equal(await readFile(file, 'utf8'), before);
});

test('remove apaga e persiste; remove inexistente devolve 404', async () => {
  const { api, file } = await makeApi();
  await api.remove(1);
  assert.deepEqual((await api.list()).map(p => p.id), [3]);
  await assert.rejects(api.remove(1), hasStatus(404));
  assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 1);
});

test('create rejeita name/description/image vazios com 400', async () => {
  const { api } = await makeApi();
  await assert.rejects(api.create({ ...valid, name: '  ' }), hasStatus(400));
  await assert.rejects(api.create({ ...valid, description: '' }), hasStatus(400));
  await assert.rejects(api.create({ ...valid, image: '' }), hasStatus(400));
});

test('create rejeita image fora de images/ ou com .. com 400', async () => {
  const { api, file } = await makeApi();
  const before = await readFile(file, 'utf8');
  await assert.rejects(api.create({ ...valid, image: '../etc/passwd' }), hasStatus(400));
  await assert.rejects(api.create({ ...valid, image: 'https://x/y.svg' }), hasStatus(400));
  assert.equal(await readFile(file, 'utf8'), before);
});

test('escritas concorrentes não perdem alterações', async () => {
  const { api, file } = await makeApi();
  await Promise.all(Array.from({ length: 10 }, (_, i) => api.create({ ...valid, name: `P${i}` })));
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.equal(saved.length, 12);
  assert.equal(new Set(saved.map(p => p.id)).size, 12);
});
