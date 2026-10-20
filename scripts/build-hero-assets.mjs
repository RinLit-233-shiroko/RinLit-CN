#!/usr/bin/env node
// Pre-size the images embedded in /api/hero.svg. EdgeOne cannot run Sharp at
// request time, so the API only reads these small, deterministic derivatives.

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HERO_DIR = join(ROOT, 'public', 'images', 'hero');
const SHARE_DIR = join(HERO_DIR, 'share');
const DIALOGUE_JSON = join(ROOT, 'src', 'data', 'home', 'dialogue.json');
const GENERATED_ASSETS = join(ROOT, 'src', 'data', 'home', 'hero-assets.generated.ts');
const LOGO_SOURCE = join(
  ROOT,
  'public',
  'images',
  'logo',
  'Type=Horizontal, Mode=Light, Monochrome=True.png',
);
const LOGO_TARGET = join(SHARE_DIR, 'rinlit-logo.webp');
const DARK_LOGO_SOURCE = join(
  ROOT,
  'public',
  'images',
  'logo',
  'Type=Horizontal, Mode=Dark, Monochrome=True.png',
);
const DARK_LOGO_TARGET = join(SHARE_DIR, 'rinlit-logo-dark.webp');

async function isFresh(source, target) {
  try {
    const [sourceStats, targetStats] = await Promise.all([stat(source), stat(target)]);
    return targetStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
}

function mimeFor(path) {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/png';
}

function inlineSvg(source) {
  return source
    .replace(/<\?xml[^>]*>/i, '')
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/\s+xlink:href=/gi, ' href=')
    .replace(/<svg\b([^>]*)>/i, (_, attrs) => {
      const clean = attrs
        .replace(/\s(?:width|height)=("[^"]*"|'[^']*')/gi, '')
        .replace(/\s(?:x|y)=("[^"]*"|'[^']*')/gi, '')
        .replace(/\s+xmlns(?::[\w.-]+)?=("[^"]*"|'[^']*')/gi, '');
      return `<svg width="24" height="24"${clean}>`;
    })
    .replace(/\s([\w:.-]+)=([^"'\s][^\s>]*)/g, ' $1="$2"');
}

function collectHeroImagePaths(value, output) {
  if (!value || typeof value !== 'object') return;
  if (value.type === 'image' && typeof value.src === 'string' && value.src.startsWith('/')) {
    output.add(value.src);
  }
  for (const child of Object.values(value)) collectHeroImagePaths(child, output);
}

async function collectHeroAssetPaths() {
  const socialSource = await readFile(join(ROOT, 'src', 'data', 'home', 'socials.ts'), 'utf8');
  const avatarNames = new Set(
    [...socialSource.matchAll(/avatar\('([^']+)'\)/g)].map((match) => match[1]),
  );
  const avatars = new Set(
    [...avatarNames].map((name) => `/images/hero/share/${basename(name, extname(name))}.webp`),
  );
  avatars.add('/images/hero/share/rinlit-logo.webp');
  avatars.add('/images/hero/share/rinlit-logo-dark.webp');

  const iconNames = new Set(
    [...socialSource.matchAll(/icon\('([^']+)'\)/g)].map((match) => match[1]),
  );
  const icons = new Set([...iconNames].map((name) => `/images/social-icons/${name}`));
  return { avatars, icons };
}

async function createImageAsset(path) {
  const source = join(ROOT, 'public', path.replace(/^\//, ''));
  const bytes = await readFile(source);
  const metadata = await sharp(bytes, { animated: true, limitInputPixels: false }).metadata();
  return {
    dataUri: `data:${mimeFor(path)};base64,${bytes.toString('base64')}`,
    width: metadata.width || 0,
    height: metadata.pageHeight || metadata.height || 0,
  };
}

async function main() {
  await mkdir(SHARE_DIR, { recursive: true });
  const files = (await readdir(HERO_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name));

  for (const entry of files) {
    const source = join(HERO_DIR, entry.name);
    const name = `${basename(entry.name, extname(entry.name))}.webp`;
    const target = join(SHARE_DIR, name);
    if (await isFresh(source, target)) continue;
    await sharp(source)
      .resize(144, 144, { fit: 'cover', position: 'attention' })
      .webp({ quality: 72, effort: 4 })
      .toFile(target);
  }

  if (!(await isFresh(LOGO_SOURCE, LOGO_TARGET))) {
    await sharp(LOGO_SOURCE)
      .resize(260, 96, { fit: 'contain', withoutEnlargement: false })
      .webp({ quality: 82, effort: 4 })
      .toFile(LOGO_TARGET);
  }

  if (!(await isFresh(DARK_LOGO_SOURCE, DARK_LOGO_TARGET))) {
    await sharp(DARK_LOGO_SOURCE)
      .resize(260, 96, { fit: 'contain', withoutEnlargement: false })
      .webp({ quality: 82, effort: 4 })
      .toFile(DARK_LOGO_TARGET);
  }

  const assetPaths = await collectHeroAssetPaths();
  const avatars = {};
  for (const path of assetPaths.avatars) {
    const bytes = await readFile(join(ROOT, 'public', path.replace(/^\//, '')));
    avatars[path] = `data:image/webp;base64,${bytes.toString('base64')}`;
  }

  const icons = {};
  for (const path of assetPaths.icons) {
    icons[path] = inlineSvg(await readFile(join(ROOT, 'public', path.replace(/^\//, '')), 'utf8'));
  }

  const dialogue = JSON.parse(await readFile(DIALOGUE_JSON, 'utf8'));
  const imagePaths = new Set();
  collectHeroImagePaths(dialogue.heroImage, imagePaths);
  const images = {};
  for (const path of imagePaths) images[path] = await createImageAsset(path);

  const generated = `// Generated by scripts/build-hero-assets.mjs. Do not edit manually.\n\n` +
    `export const heroAssets: {\n` +
    `  avatars: Record<string, string>;\n` +
    `  icons: Record<string, string>;\n` +
    `  images: Record<string, { dataUri: string; width: number; height: number }>;\n` +
    `} = ${JSON.stringify({ avatars, icons, images }, null, 2)};\n`;
  await writeFile(GENERATED_ASSETS, generated);

  console.log(
    `[hero] Prepared ${files.length} avatars, ${assetPaths.icons.size} icons, ` +
      `${imagePaths.size} dialogue images + 2 logos`,
  );
}

main().catch((error) => {
  console.error('[hero] Failed to prepare share images:', error);
  process.exitCode = 1;
});
