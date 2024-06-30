import { rimraf } from 'rimraf';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

// read version from package.json
const pkg = JSON.parse(await readFile('package.json'));
process.env.GLOOM_BUILD_VERSION = pkg.version;

const isDevelopment = process.argv.includes('--dev');

await rimraf('dist');
await mkdir('dist');

// don't compile these files
await copyFile('src/sw.js', 'dist/sw.js');
await copyFile('src/config.js', 'dist/gloom.config.js');

await build({
    platform: 'browser',
    sourcemap: true,
    minify: !isDevelopment,
    entryPoints: {
        'gloom.bundle': './src/rewrite/index.js',
        'uv.handler': './src/uv.handler.js',
        'gloom.worker': './src/worker.js',
    },
    define: {
        'process.env.GLOOM_BUILD_VERSION': JSON.stringify(
            process.env.GLOOM_BUILD_VERSION
        ),
    },
    bundle: true,
    logLevel: 'info',
    outdir: 'dist/',
});