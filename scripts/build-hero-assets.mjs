#!/usr/bin/env node
// Pre-size the images embedded in /api/hero.svg. EdgeOne cannot run Sharp at
// request time, so the API only reads these small, deterministic derivatives.

import { mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HERO_DIR = join(ROOT, 'public', 'images', 'hero');
const SHARE_DIR = join(HERO_DIR, 'share');
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

  console.log(`[hero] Prepared ${files.length} avatars + 2 logos in public/images/hero/share`);
}

main().catch((error) => {
  console.error('[hero] Failed to prepare share images:', error);
  process.exitCode = 1;
});
