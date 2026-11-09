import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { createProductsApi } from './server/productsApi.js';
import { saveImage, MAX_IMAGE_BYTES } from './server/imagesApi.js';

const api = createProductsApi(fileURLToPath(new URL('./products.json', import.meta.url)));
const imagesDir = fileURLToPath(new URL('./images/', import.meta.url));
const MAX_BODY = 1_000_000;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(Object.assign(new Error('Corpo demasiado grande'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error('JSON inválido'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > limit) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) reject(Object.assign(new Error('Ficheiro demasiado grande (máx. 5 MB)'), { status: 413 }));
      else resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.statusCode = status;
  if (data === undefined) return res.end();
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function productsApi() {
  return {
    name: 'products-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url.split('?')[0];

        if (url.startsWith('/api/images/')) {
          if (req.method !== 'PUT') return send(res, 405, { error: 'Método não permitido' });
          try {
            const name = decodeURIComponent(url.slice('/api/images/'.length));
            if (!name) return send(res, 400, { error: 'Ficheiro sem nome' });
            const buffer = await readBody(req, MAX_IMAGE_BYTES);
            return send(res, 201, { path: await saveImage(imagesDir, name, buffer) });
          } catch (error) {
            return send(res, error.status || 400, { error: error.message });
          }
        }

        const match = /^\/api\/products(?:\/(\d+))?\/?$/.exec(url);
        if (!match) return next();

        const id = match[1];
        try {
          if (req.method === 'GET' && !id) return send(res, 200, await api.list());
          if (req.method === 'POST' && !id) return send(res, 201, await api.create(await readJson(req)));
          if (req.method === 'PUT' && id) return send(res, 200, await api.update(id, await readJson(req)));
          if (req.method === 'DELETE' && id) {
            await api.remove(id);
            return send(res, 204);
          }
          return send(res, 405, { error: 'Método não permitido' });
        } catch (error) {
          send(res, error.status || 500, { error: error.message });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [productsApi()],
});
