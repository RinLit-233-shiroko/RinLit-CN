/**
 * 「平行世界的我」头像墙的排布规则。
 *
 * 头像墙每行的数量是固定的（3/4/3/4/3），因为卡片的网格是按这个尺寸定位
 * 和缩放的：只要每行的人数不变，随机换人就不会影响展开动画和滚动距离。
 *
 * 其中第二排是卡片里完整露出来、最显眼的一排，所以权重高的账号会被优先
 * 抽到那一排；剩下的位置再随机分配，保证每次刷新看到的排列都不一样。
 */

export interface DeckLayout {
  /** 从上到下每排的头像数量。 */
  rowSizes: number[];
  /** 需要重点展示的那一排（从 0 开始）。 */
  highlightRow: number;
}

export const avatarDeckLayout: DeckLayout = {
  rowSizes: [3, 4, 3, 4, 3],
  highlightRow: 1,
};

/** 参与排布的条目：只需要一个稳定 id 和可选权重。 */
export interface DeckItem {
  id: string;
  weight?: number;
}

const DEFAULT_WEIGHT = 1;

function weightOf(item: DeckItem): number {
  const weight = item.weight ?? DEFAULT_WEIGHT;
  return Number.isFinite(weight) && weight > 0 ? weight : 0;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/**
 * 不放回的加权抽取（Efraimidis–Spirakis）：给每个条目取 r^(1/权重) 作为
 * 键，取键最大的若干个。权重越大，键越接近 1，被选中的机会越高，同时
 * 同一个账号绝不会在一排里重复出现。
 */
function weightedPick<T extends DeckItem>(items: T[], size: number, random: () => number): T[] {
  if (size >= items.length) return shuffle(items, random);
  if (items.every((item) => weightOf(item) === 0)) return shuffle(items, random).slice(0, size);

  return items
    .map((item) => {
      const weight = weightOf(item);
      return { item, key: weight > 0 ? Math.pow(random(), 1 / weight) : 0 };
    })
    .sort((a, b) => b.key - a.key)
    .slice(0, size)
    .map((entry) => entry.item);
}

/**
 * 把条目按 layout 分到每一排。
 *
 * @param items 候选账号，通常是 socialProfiles。
 * @param layout 每排人数与重点排的下标。
 * @param random 注入的随机源，方便测试或复现某一组排列。
 */
export function buildDeckRows<T extends DeckItem>(
  items: T[],
  layout: DeckLayout = avatarDeckLayout,
  random: () => number = Math.random,
): T[][] {
  const pool = items.slice();
  const rows: T[][] = [];

  for (const [rowIndex, rowSize] of layout.rowSizes.entries()) {
    // Stop instead of emitting empty rows: a blank row would still take up the
    // row height and leave a hole in the deck.
    if (!pool.length) break;
    const size = Math.min(rowSize, pool.length);
    const picked = rowIndex === layout.highlightRow
      ? weightedPick(pool, size, random)
      : shuffle(pool, random).slice(0, size);
    const pickedIds = new Set(picked.map((item) => item.id));
    for (let index = pool.length - 1; index >= 0; index--) {
      if (pickedIds.has(pool[index].id)) pool.splice(index, 1);
    }
    rows.push(picked);
  }

  // More accounts than slots: keep them instead of silently dropping them, and
  // let the deck's existing overflow scrolling handle the extra row.
  if (pool.length) rows.push(shuffle(pool, random));

  return rows;
}
