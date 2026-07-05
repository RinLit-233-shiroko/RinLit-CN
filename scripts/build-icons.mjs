#!/usr/bin/env node
// Build-time icon extractor.
//
// Scans src/ for icon usages and writes src/utils/icons.generated.ts
// containing the pre-read SVG content. The generated file is committed
// to git so a fresh checkout can build without running this script first.
//
// Re-runs automatically on `predev` and `prebuild` (see package.json).

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), '..');
const SRC_DIR = join(ROOT, 'src');
const GENERATED_FILE = join(SRC_DIR, 'utils', 'icons.generated.ts');
const ICONS_BASE = join(ROOT, 'node_modules', '@tabler', 'icons', 'icons');

const SOURCE_EXT = /\.(astro|ts|tsx|js|jsx|mjs)$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', 'generated']);
const ICON_NAME = '[a-z][a-z0-9-]+';

const PATTERNS = [
  new RegExp(`getIcon\\s*\\(\\s*['"\`](${ICON_NAME})['"\`]`),
  new RegExp(`\\bicon\\s*=\\s*['"\`](${ICON_NAME})['"\`]`),
  new RegExp(`\\bicon\\s*:\\s*['"\`](${ICON_NAME})['"\`]`),
];

function findSourceFiles(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findSourceFiles(fullPath, results);
    } else if (SOURCE_EXT.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractIconNames(files) {
  const names = new Set();
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const cleaned = content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    for (const pattern of PATTERNS) {
      const matches = cleaned.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        names.add(match[1]);
      }
    }
  }
  return [...names].sort();
}

function readIcon(name, variant) {
  const dir = variant === 'filled' ? join(ICONS_BASE, 'filled') : join(ICONS_BASE, 'outline');
  const filePath = join(dir, `${name}.svg`);
  if (existsSync(filePath)) {
    return readFileSync(filePath, 'utf-8').trim();
  }
  if (variant === 'filled') {
    const fallback = join(ICONS_BASE, 'outline', `${name}.svg`);
    if (existsSync(fallback)) {
      return readFileSync(fallback, 'utf-8').trim();
    }
  }
  throw new Error(
    `[icons] Icon "${name}" not found in @tabler/icons (tried ${variant}${
      variant === 'filled' ? ' and outline fallback' : ''
    }): ${filePath}`,
  );
}

function buildGenerated(iconNames) {
  const entries = iconNames.map((name) => {
    const outline = readIcon(name, 'outline');
    const filled = readIcon(name, 'filled');
    return [
      `  ${JSON.stringify(name)}: {`,
      `    outline: ${JSON.stringify(outline)},`,
      `    filled: ${JSON.stringify(filled)},`,
      `  },`,
    ].join('\n');
  });

  return [
    '// Auto-generated. Do not edit manually.',
    '// Regenerate with: npm run icons:build',
    '// Source: scripts/build-icons.mjs',
    '',
    'export interface IconEntry {',
    '  outline: string;',
    '  filled: string;',
    '}',
    '',
    'export type IconVariant = keyof IconEntry;',
    '',
    `export const ICONS: Record<string, IconEntry> = {\n${entries.join('\n')}\n};`,
    '',
  ].join('\n');
}

function main() {
  const sourceFiles = findSourceFiles(SRC_DIR);
  const iconNames = extractIconNames(sourceFiles);

  if (iconNames.length === 0) {
    console.warn('[icons] No icon usages found in src/. Skipping generation.');
    return;
  }

  const content = buildGenerated(iconNames);
  writeFileSync(GENERATED_FILE, content, 'utf-8');
  console.log(`[icons] Generated ${iconNames.length} icons → ${GENERATED_FILE}`);
}

main();