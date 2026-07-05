// Icon lookup — pure function over a build-time generated map.
//
// The map at `src/utils/icons.generated.ts` is produced by
// `scripts/build-icons.mjs`, which scans src/ for `getIcon('name', ...)`
// calls and `icon="name"` props, then inlines the matching SVG strings
// from `@tabler/icons`. Adding a new icon is as simple as using it in
// a component — the predev/prebuild hooks regenerate the map automatically.
//
// Keeping the data fully static (no fs, no glob, no node_modules reads at
// runtime) makes this work identically in dev, build, and production.

import { ICONS, type IconVariant } from './icons.generated';

export type { IconVariant };

export function getIcon(
  name: string,
  size = 18,
  variant: IconVariant = 'outline',
): string {
  const entry = ICONS[name];
  if (!entry) return '';
  return entry[variant]
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`);
}
