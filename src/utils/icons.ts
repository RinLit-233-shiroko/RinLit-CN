type IconVariant = 'outline' | 'filled';

const outlineIcons = import.meta.glob<string>('../../node_modules/@tabler/icons/icons/outline/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const filledIcons = import.meta.glob<string>('../../node_modules/@tabler/icons/icons/filled/*.svg', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const iconSets: Record<IconVariant, Record<string, string>> = {
  outline: outlineIcons,
  filled: filledIcons,
};

function readRaw(name: string, variant: IconVariant): string | null {
  return iconSets[variant][`../../node_modules/@tabler/icons/icons/${variant}/${name}.svg`] ?? null;
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
