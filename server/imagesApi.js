import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const FORMATS = [
  { ext: 'png', match: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'jpg', match: b => b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'webp', match: b => b.length > 11 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
];

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function baseName(originalName) {
  return String(originalName)
    .replace(/\.[^.]*$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'imagem';
}

export async function saveImage(dir, originalName, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw fail(400, 'Ficheiro vazio');
  if (buffer.length > MAX_IMAGE_BYTES) throw fail(413, 'Imagem demasiado grande (máx. 5 MB)');

  // SVG is intentionally absent: it can carry script and is served from this origin.
  const format = FORMATS.find(f => f.match(buffer));
  if (!format) throw fail(400, 'Formato não suportado (usa PNG, JPEG ou WebP)');

  const base = baseName(originalName);
  for (let n = 1; ; n++) {
    const name = n === 1 ? `${base}.${format.ext}` : `${base}-${n}.${format.ext}`;
    try {
      // wx fails instead of overwriting, so concurrent uploads of the same name get distinct files.
      await writeFile(join(dir, name), buffer, { flag: 'wx' });
      return `images/${name}`;
    } catch (error) {
      if (error.code !== 'EEXIST') throw fail(500, 'Não foi possível gravar a imagem');
    }
  }
}
