/**
 * 统一图标工具 — 基于 @tabler/icons
 *
 * 用法:
 *   import { getIcon } from '../utils/icons';
 *   getIcon('sun')                 → 18x18 outline (默认)
 *   getIcon('sun', 24)             → 24x24 outline
 *   getIcon('sun', 18, 'filled')   → 18x18 filled 版本
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 从 src/utils/ → 项目根 → node_modules/@tabler/icons/icons/{variant}
const ICONS_BASE = path.resolve(__dirname, '..', '..', 'node_modules', '@tabler', 'icons', 'icons');

/** 缓存已读取的原始 SVG, key = `${variant}:${name}` */
const cache = new Map<string, string>();

function readRaw(name: string, variant: 'outline' | 'filled'): string | null {
  const key = `${variant}:${name}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const svg = fs.readFileSync(path.join(ICONS_BASE, variant, `${name}.svg`), 'utf-8');
    cache.set(key, svg);
    return svg;
  } catch {
    return null;
  }
}

/**
 * 返回指定名称 + 尺寸的 Tabler 图标 HTML 字符串。
 * variant 默认 'outline', 可传 'filled'。
 * 未找到时返回空字符串（静默降级）。
 */
export function getIcon(
  name: string,
  size = 18,
  variant: 'outline' | 'filled' = 'outline',
): string {
  const raw = readRaw(name, variant);
  if (!raw) return '';
  // 注入 width / height，保留其余属性不变
  return raw.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`);
}
