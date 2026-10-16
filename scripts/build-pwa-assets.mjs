#!/usr/bin/env node
// Build-time PWA asset generator.
//
// Renders the PWA icon set into public/icons/ from the brand logo art in
// public/images/logo/. Output files are committed to git so a fresh checkout
// can build without running this script first.
//
// Re-runs automatically on `predev` and `prebuild` (see package.json).
//
// Sizing rule: each icon is laid out so the *opaque* pixels of the mark stay
// inside a target radius of the canvas. That keeps maskable icons inside
// Android's 80% safe circle while still filling the plate as much as possible.

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_DIR = join(ROOT, 'public', 'images', 'logo');
const OUT_DIR = join(ROOT, 'public', 'icons');

// Brand tokens (mirrors src/styles/global.css)
const BRAND = '#8c7ecd';
const BRAND_DEEP = '#695cb0';
const PLATE_LIGHT = '#ffffff';

const MARK_PURPLE = join(LOGO_DIR, 'Type=Square, Mode=Light, Monochrome=False.png');
const MARK_WHITE = join(LOGO_DIR, 'Type=Square, Mode=Dark, Monochrome=True.png');

const ALPHA_THRESHOLD = 24;

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    return null;
  }
}

/**
 * Max distance from the image centre to any opaque pixel.
 * Used to fit the mark inside a circular safe area.
 */
async function radialExtent(sharp, buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cx = (info.width - 1) / 2;
  const cy = (info.height - 1) / 2;
  let max = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > max) max = dist;
    }
  }

  return max || Math.max(info.width, info.height) / 2;
}

/**
 * Render one square icon.
 *
 * @param {object} options
 * @param {string} options.src        transparent PNG of the mark
 * @param {number} options.size       output edge length in px
 * @param {string|object} options.plate  background colour, or null for transparency
 * @param {number} options.radiusRatio opaque mark must fit inside size * ratio
 * @param {string} options.out        output file name inside public/icons/
 */
async function renderIcon(sharp, { src, size, plate, radiusRatio, out }) {
  const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  const extent = await radialExtent(sharp, trimmed);

  // Scale so the furthest opaque pixel lands exactly on the safe radius.
  const targetRadius = size * radiusRatio;
  const scale = targetRadius / extent;
  const meta = await sharp(trimmed).metadata();
  const width = Math.max(1, Math.round(meta.width * scale));
  const height = Math.max(1, Math.round(meta.height * scale));

  const scaled = await sharp(trimmed)
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: plate ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const png = await canvas
    .composite([{ input: scaled, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(join(OUT_DIR, out), png);
  return { out, size, bytes: png.length };
}

/** Same mark, but on a flat brand plate with an opaque (alpha=255) background. */
async function renderPlate(sharp, { size, colour, out }) {
  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: colour },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(join(OUT_DIR, out), png);
  return { out, size, bytes: png.length };
}

async function main() {
  const sharp = await loadSharp();

  if (!sharp) {
    const existing = existsSync(join(OUT_DIR, 'icon-512.png'));
    const message =
      '[pwa] sharp is unavailable — skipped PWA icon generation' +
      (existing ? ' (using committed icons).' : '.');
    if (existing) {
      console.warn(message);
      return;
    }
    throw new Error(`${message} Install sharp and re-run: npm run pwa:build`);
  }

  if (!existsSync(MARK_PURPLE) || !existsSync(MARK_WHITE)) {
    throw new Error(`[pwa] logo source art missing in ${LOGO_DIR}`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const results = [];

  // `any` icons — brand mark on a light plate.
  for (const size of [192, 512]) {
    results.push(
      await renderIcon(sharp, {
        src: MARK_PURPLE,
        size,
        plate: PLATE_LIGHT,
        radiusRatio: 0.46,
        out: `icon-${size}.png`,
      }),
    );
  }

  // Maskable icons — inverted mark on brand plate, inside the 80% safe circle.
  for (const size of [192, 512]) {
    results.push(
      await renderIcon(sharp, {
        src: MARK_WHITE,
        size,
        plate: BRAND,
        radiusRatio: 0.4,
        out: `maskable-${size}.png`,
      }),
    );
  }

  // iOS home screen icon — opaque, iOS applies its own corner mask.
  results.push(
    await renderIcon(sharp, {
      src: MARK_WHITE,
      size: 180,
      plate: BRAND_DEEP,
      radiusRatio: 0.44,
      out: 'apple-touch-icon.png',
    }),
  );

  // Monochrome (themed) icon — silhouette on transparency.
  results.push(
    await renderIcon(sharp, {
      src: MARK_PURPLE,
      size: 512,
      plate: null,
      radiusRatio: 0.4,
      out: 'monochrome-512.png',
    }),
  );

  // Flat plates reused by the offline page / splash backgrounds.
  results.push(await renderPlate(sharp, { size: 512, colour: PLATE_LIGHT, out: 'plate-light.png' }));
  results.push(await renderPlate(sharp, { size: 512, colour: '#101216', out: 'plate-dark.png' }));

  for (const item of results) {
    console.log(`[pwa] ${item.out} — ${item.size}×${item.size} (${(item.bytes / 1024).toFixed(1)} kB)`);
  }
  console.log(`[pwa] Generated ${results.length} assets → ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
