import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

// The engine writes its gamelog outside this repo, so the dev server serves it
// explicitly at /log.mmgl for the `?log=/log.mmgl` workflow (`run-match-rust`).
// Dev only — nothing about this reaches the Vercel build.
const ENGINE_LOG = fileURLToPath(new URL('../../engine/log.mmgl', import.meta.url));

const engineLog = {
    name: 'mm-engine-log',
    apply: 'serve',
    configureServer(server) {
        server.middlewares.use('/log.mmgl', async (req, res, next) => {
            try {
                const body = await readFile(ENGINE_LOG);
                res.setHeader('Content-Type', 'application/x-ndjson');
                res.setHeader('Cache-Control', 'no-store');
                res.end(body);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    res.statusCode = 404;
                    res.end('no engine log yet — run a match first');
                    return;
                }
                next(err);
            }
        });
    },
};

// Only visualizer/ is built. Every other page in this repo is plain static HTML
// served straight from the repo root, so the build must not touch them.
//
// dev:   http://localhost:5173/            (root === repo root, full site incl. /visualizer/)
// build: visualizer/dist/, served at /visualizer/dist/ by Vercel
export default defineConfig(({ command }) => ({
    root: command === 'build' ? 'visualizer' : '.',
    base: command === 'build' ? '/visualizer/dist/' : '/',
    plugins: [engineLog],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2022',
    },
}));
