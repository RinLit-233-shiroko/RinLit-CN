import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(root, '..');
const dialoguePath = resolve(projectRoot, 'src/data/home/dialogue.json');

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function dialogueFilePlugin() {
  return {
    name: 'dialogue-file-api',
    configureServer(server) {
      server.middlewares.use('/__dialogue/file', async (request, response) => {
        response.setHeader('content-type', 'application/json; charset=utf-8');
        try {
          if (request.method === 'GET') {
            response.end(await readFile(dialoguePath, 'utf8'));
            return;
          }
          if (request.method === 'PUT') {
            const body = JSON.parse(await readBody(request));
            await writeFile(dialoguePath, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
            response.end(JSON.stringify({ ok: true }));
            return;
          }
          response.statusCode = 405;
          response.end(JSON.stringify({ error: 'Method not allowed' }));
        } catch (error) {
          response.statusCode = 500;
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}

export default defineConfig({
  root,
  plugins: [dialogueFilePlugin(), react()],
  server: {
    host: '127.0.0.1',
    port: 4319,
    strictPort: false,
  },
});
