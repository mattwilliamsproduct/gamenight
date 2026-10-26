import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
  buildReviewManifest,
  detectDemoDeepLinks,
  isProductionReviewEnv
} from './review-catalog.mjs';

const execFileAsync = promisify(execFile);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = join(rootDir, 'preview-only', 'review');
const outputDir = join(rootDir, 'public', 'review');

export async function emitReviewGallery({
  env = process.env,
  publicReviewDir = outputDir,
  previewSourceDir = sourceDir
} = {}) {
  if (isProductionReviewEnv({
    vercelEnv: env.VERCEL_ENV,
    vercelUrl: env.VERCEL_URL,
    vercelAlias: env.VERCEL_PROJECT_PRODUCTION_URL
  })) {
    await rm(publicReviewDir, {recursive: true, force: true});
    return {emitted: false, reason: 'production'};
  }

  const indexHtml = await readFile(join(rootDir, 'public', 'index.html'), 'utf8');
  let commit = env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA || '';
  if (!commit) {
    try {
      const {stdout} = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], {cwd: rootDir});
      commit = stdout.trim();
    } catch {
      commit = 'local';
    }
  }

  await rm(publicReviewDir, {recursive: true, force: true});
  await mkdir(publicReviewDir, {recursive: true});
  await cp(previewSourceDir, publicReviewDir, {recursive: true});

  const manifest = buildReviewManifest({
    commit,
    generatedAt: new Date().toISOString(),
    demoReady: detectDemoDeepLinks(indexHtml)
  });
  await writeFile(join(publicReviewDir, 'catalog.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return {emitted: true, tileCount: manifest.tileCount, demoReady: manifest.demoReady, commit: manifest.commit};
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const result = await emitReviewGallery();
  if (result.emitted) {
    console.log(`Review gallery emitted (${result.tileCount} tiles, commit ${result.commit}, demoReady=${result.demoReady}).`);
  } else {
    console.log('Review gallery skipped: production build must not emit /review.');
  }
}
