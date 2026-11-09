import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveImage } from '../server/imagesApi.js';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-data')]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('jpeg-data')]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.from('webp-data')]);

const hasStatus = status => err => err.status === status;

async function makeDir() {
  return mkdtemp(join(tmpdir(), 'images-api-'));
}

test('grava PNG e devolve caminho com os mesmos bytes', async () => {
  const dir = await makeDir();
  const path = await saveImage(dir, 'Foto da Placa.png', png);
  assert.equal(path, 'images/foto-da-placa.png');
  assert.deepEqual(await readFile(join(dir, 'foto-da-placa.png')), png);
});

test('deteta JPEG e WebP pelos magic bytes, ignorando a extensão do nome', async () => {
  const dir = await makeDir();
  assert.equal(await saveImage(dir, 'a.gif', jpeg), 'images/a.jpg');
  assert.equal(await saveImage(dir, 'b.png', webp), 'images/b.webp');
});

test('rejeita conteúdo que não é imagem com 400', async () => {
  const dir = await makeDir();
  await assert.rejects(saveImage(dir, 'nota.png', Buffer.from('hello')), hasStatus(400));
  assert.deepEqual(await readdir(dir), []);
});

test('rejeita ficheiro acima de 5 MB com 413', async () => {
  const dir = await makeDir();
  await assert.rejects(saveImage(dir, 'grande.png', Buffer.alloc(5 * 1024 * 1024 + 1)), hasStatus(413));
});

test('sanitiza nomes com traversal para um ficheiro dentro da pasta', async () => {
  const dir = await makeDir();
  const path = await saveImage(dir, '../../etc/passwd.png', png);
  assert.match(path, /^images\/etc-passwd\.png$/);
  assert.deepEqual(await readdir(dir), ['etc-passwd.png']);
});

test('nomes repetidos geram sufixo -2', async () => {
  const dir = await makeDir();
  assert.equal(await saveImage(dir, 'foto.png', png), 'images/foto.png');
  assert.equal(await saveImage(dir, 'foto.png', png), 'images/foto-2.png');
  assert.deepEqual((await readdir(dir)).sort(), ['foto-2.png', 'foto.png']);
});

test('uploads concorrentes com o mesmo nome não se sobrepõem', async () => {
  const dir = await makeDir();
  const other = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('outra-png')]);
  const paths = await Promise.all([saveImage(dir, 'foto.png', png), saveImage(dir, 'foto.png', other)]);
  assert.equal(new Set(paths).size, 2);
  const files = await readdir(dir);
  assert.equal(files.length, 2);
  const contents = await Promise.all(files.map(f => readFile(join(dir, f))));
  assert.equal(contents.some(c => c.equals(png)), true);
  assert.equal(contents.some(c => c.equals(other)), true);
});
