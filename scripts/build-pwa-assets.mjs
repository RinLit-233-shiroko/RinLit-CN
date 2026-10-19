#!/usr/bin/env node
// Build-time PWA asset generator.
//
// Renders the PWA icon set into public/icons/ from the brand logo art in
// public/images/logo/. Output files are committed to git so a fresh checkout
// can build without running this script first.
//
// Re-runs automatically on `predev` and `prebuild` (see package.json).
//
// Sizing rule: the source logo art is scaled as a whole, then centred on the
// output canvas. Nothing is trimmed or re-centred.
//
// The source 512×512 art is intentionally NOT trimmed. In the Figma file the
// mark sits horizontally centred but slightly above the middle (62px top /
// 102px bottom padding). Trimming and re-centring would discard that optical
// offset and make the icon look like it has drifted upward.
//
// The same art is effectively maskable-safe: its fully opaque edge reaches
// 79.87% of the half-width, with only sub-pixel anti-aliasing beyond Android's
// 80% safe circle. Scaling the whole canvas keeps the design geometry intact.

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

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    return null;
  }
}

/**
 * Render one square icon.
 *
 * @param {object} options
 * @param {string} options.src        transparent PNG of the mark
 * @param {number} options.size       output edge length in px
 * @param {string|object} options.plate  background colour, or null for transparency
 * @param {string} options.out        output file name inside public/icons/
 */
async function renderIcon(sharp, { src, size, plate, out }) {
  // Keep the whole 1:1 design canvas. The source padding is part of the
  // artwork, so it must scale with the mark instead of being cropped away.
  const meta = await sharp(src).metadata();
  const source = await sharp(src).png().toBuffer();

  // A same-size render must be a byte-identical copy: resampling here would
  // erode the anti-aliased edges by ~1px.
  const scaled =
    meta.width === size && meta.height === size
      ? source
      : await sharp(source)
          .resize(size, size, { fit: 'fill', kernel: 'lanczos3' })
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
        out: `icon-${size}.png`,
      }),
    );
  }

  // Maskable icons — inverted mark on brand plate. The opaque artwork sits
  // inside the 80% safe circle, so no extra inset is applied.
  for (const size of [192, 512]) {
    results.push(
      await renderIcon(sharp, {
        src: MARK_WHITE,
        size,
        plate: BRAND,
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
      out: 'apple-touch-icon.png',
    }),
  );

  // Monochrome (themed) icon — silhouette on transparency.
  // Uses the white monochrome art: the OS tints monochrome icons from their
  // alpha channel, so a brand-coloured copy would not be truly monochrome.
  results.push(
    await renderIcon(sharp, {
      src: MARK_WHITE,
      size: 512,
      plate: null,
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
