// Bundles the Electron main process and preload script.
// Usage: node scripts/build-electron.mjs [--dev]
import { build } from 'esbuild';

const dev = process.argv.includes('--dev');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node24',
  external: ['electron', 'npm-check-updates'],
  sourcemap: dev,
  minify: !dev,
  logLevel: 'info',
};

await Promise.all([
  build({
    ...common,
    entryPoints: ['electron/main.ts'],
    outfile: 'dist/electron/main.mjs',
    format: 'esm',
  }),
  // sandboxed preload scripts must be CommonJS
  build({
    ...common,
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist/electron/preload.cjs',
    format: 'cjs',
  }),
]);
