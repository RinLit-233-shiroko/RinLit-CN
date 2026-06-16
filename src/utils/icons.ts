/**
 * 统一图标工具 — 基于 @tabler/icons (outline)
 *
 * 用法:
 *   import { getIcon } from '../utils/icons';
 *   getIcon('sun')        → 18x18 默认尺寸的 SVG 字符串
 *   getIcon('menu', 24)   → 24x24 的 SVG 字符串
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 从 src/utils/ → 项目根 → node_modules/@tabler/icons/icons/outline
const ICONS_DIR = path.resolve(__dirname, '..', '..', 'node_modules', '@tabler', 'icons', 'icons', 'outline');

/** 缓存已读取的原始 SVG */
const cache = new Map<string, string>();

function readRaw(name: string): string | null {
  if (cache.has(name)) return cache.get(name)!;
  try {
    const svg = fs.readFileSync(path.join(ICONS_DIR, `${name}.svg`), 'utf-8');
    cache.set(name, svg);
    return svg;
  } catch {
    return null;
  }
}

/**
 * 返回指定名称 + 尺寸的 Tabler 图标 HTML 字符串。
 * 未找到时返回空字符串（静默降级）。
 */
export function getIcon(name: string, size = 18): string {
  const raw = readRaw(name);
  if (!raw) return '';
  // 注入 width / height，保留其余属性不变
  return raw.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`);
}
