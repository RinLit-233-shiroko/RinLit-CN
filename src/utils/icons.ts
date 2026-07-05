type IconVariant = 'outline' | 'filled';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_BASE = path.resolve(__dirname, '..', '..', 'node_modules', '@tabler', 'icons', 'icons');
const cache = new Map<string, string>();

function readRaw(name: string, variant: IconVariant): string | null {
  const key = `${variant}:${name}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const raw = fs.readFileSync(path.join(ICONS_BASE, variant, `${name}.svg`), 'utf-8');
    cache.set(key, raw);
    return raw;
  } catch {
    return null;
  }
}

export function getIcon(
  name: string,
  size = 18,
  variant: IconVariant = 'outline',
): string {
  const raw = readRaw(name, variant);
  if (!raw) return '';
  return raw.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`);
}
