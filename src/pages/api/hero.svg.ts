import type { APIRoute } from 'astro';
import { avatarDeckLayout, buildDeckRows } from '../../data/home/deck';
import { homeDialogue, type HeroImageMessage } from '../../data/home/dialogue';
import { socialProfiles, type SocialProfile } from '../../data/home/socials';
import { t } from '../../i18n/index';

export const prerender = false;

const AVATAR_SIZE = 84;
const AVATAR_GAP = 24;
const INVERT_ICON_IDS = new Set(['github', 'apple', 'steam', 'x']);
const ASSET_CACHE = new Map<string, Promise<string>>();
const IMAGE_SIZE_CACHE = new Map<string, Promise<{ width: number; height: number }>>();
const themes = {
  light: {
    card: '#ede9fc',
    cardText: '#1a1533',
    deckText: '#423c65',
    avatarPlaceholder: '#d9d4e9',
    avatarBadge: '#fbfafb',
    chat: '#fbfafb',
    chatHeader: '#f1f0f5',
    chatText: '#111111',
    chatMuted: '#7d768f',
    chatMessage: '#f5f4f8',
    composerText: '#6b687d',
    pillBackground: '#fbfaff',
    pillBackgroundOpacity: '.4',
    pillBorder: '#ffffff',
    pillBorderOpacity: '1',
    pillIcon: '#101216',
    primaryPill: '#8c7ecd',
    primaryPillOpacity: '.6',
    invertIcons: false,
  },
  dark: {
    card: '#181834',
    cardText: '#efebf7',
    deckText: '#fbfafb',
    avatarPlaceholder: '#423c65',
    avatarBadge: '#2e2e32',
    chat: '#161616',
    chatHeader: '#24232d',
    chatText: '#ffffff',
    chatMuted: '#a39fbf',
    chatMessage: '#423c65',
    composerText: '#a39fbf',
    pillBackground: '#c2bfd0',
    pillBackgroundOpacity: '.3',
    pillBorder: '#ffffff',
    pillBorderOpacity: '.22',
    pillIcon: '#ffffff',
    primaryPill: '#8c7ecd',
    primaryPillOpacity: '.48',
    invertIcons: true,
  },
} as const;

type Theme = typeof themes.light | typeof themes.dark;
type LayoutName = 'wide' | 'compact';

interface HeroGeometry {
  viewWidth: number;
  viewHeight: number;
  cardWidth: number;
  cardHeight: number;
  cardRadius: number;
  chatX: number;
  chatY: number;
  chatWidth: number;
  chatHeight: number;
  chatRadius: number;
  chatInset: number;
  chatContentWidth: number;
  chatContentX: number;
  chatMessageMaxWidth: number;
  chatImageMaxWidth: number;
  chatMessagesTop: number;
  chatMessagesBottom: number;
  messageTop: number;
  messageGap: number;
  messageFontSize: number;
  messageLineHeight: number;
  messageTextUnits: number;
  messagePaddingLeft: number;
  messagePaddingRight: number;
  composerWidth: number;
  composerBottom: number;
  composerGap: number;
  sendSize: number;
  avatarSize: number;
  avatarGap: number;
  avatarRowStep: number;
  avatarStartY: number;
  avatarSideInset: number;
  avatarRowOffsetX: number;
  deckTop: number;
  deckHeight: number;
  deckLabelY: number;
  logoWidth: number;
  logoHeight: number;
  logoY: number;
  greetingY: number;
  greetingFontSize: number;
}

function geometryFor(layout: LayoutName): HeroGeometry {
  if (layout === 'compact') {
    const cardWidth = 600;
    const cardHeight = 360;
    const chatHeight = 640;
    const cardGap = 30;
    const introHeight = 220;
    const deckHeight = 140;
    const gridScale = 0.88;
    const gridOffsetY = -84;
    const avatarBaseGap = 24;
    const avatarBaseStep = 100;
    const cardRadius = 26;
    const chatY = cardHeight + cardGap;
    const chatInset = 24;
    const chatContentWidth = cardWidth - chatInset * 2;
    const composerWidth = 480;
    const composerBottom = 24;
    const avatarGap = avatarBaseGap * gridScale;
    const avatarRowStep = avatarBaseStep * gridScale;
    return {
      viewWidth: cardWidth,
      viewHeight: chatY + chatHeight,
      cardWidth,
      cardHeight,
      cardRadius,
      chatX: 0,
      chatY,
      chatWidth: cardWidth,
      chatHeight,
      chatRadius: 24,
      chatInset,
      chatContentWidth,
      chatContentX: chatInset + 4,
      chatMessageMaxWidth: chatContentWidth,
      chatImageMaxWidth: 260,
      chatMessagesTop: 108,
      chatMessagesBottom: chatHeight - composerBottom - 40 - 22,
      messageTop: 122,
      messageGap: 10,
      messageFontSize: 14,
      messageLineHeight: 19,
      messageTextUnits: 36,
      messagePaddingLeft: 16,
      messagePaddingRight: 16,
      composerWidth,
      composerBottom,
      composerGap: 10,
      sendSize: 40,
      avatarSize: 84,
      avatarGap,
      avatarRowStep,
      avatarStartY: introHeight + gridOffsetY * gridScale,
      avatarSideInset: 0,
      avatarRowOffsetX: 0,
      deckTop: introHeight,
      deckHeight,
      deckLabelY: introHeight + 23,
      logoWidth: 130,
      logoHeight: 48,
      logoY: 32,
      greetingY: 198,
      greetingFontSize: 80.64,
    };
  }

  const cardWidth = 400;
  const chatWidth = 856;
  const cardHeight = 600;
  const gap = 32;
  const chatX = cardWidth + gap;
  const chatInset = 24;
  const chatContentWidth = 640;
  return {
    viewWidth: cardWidth + gap + chatWidth,
    viewHeight: cardHeight,
    cardWidth,
    cardHeight,
    cardRadius: 26,
    chatX,
    chatY: 0,
    chatWidth,
    chatHeight: cardHeight,
    chatRadius: 24,
    chatInset,
    chatContentWidth,
    chatContentX: (chatWidth - chatContentWidth) / 2 + 16,
    chatMessageMaxWidth: 500,
    chatImageMaxWidth: 385,
    chatMessagesTop: 108,
    chatMessagesBottom: 508,
    messageTop: 122,
    messageGap: 10,
    messageFontSize: 16,
    messageLineHeight: 22,
    messageTextUnits: 30,
    messagePaddingLeft: 16,
    messagePaddingRight: 16,
    composerWidth: 480,
    composerBottom: 24,
    composerGap: 10,
    sendSize: 40,
    avatarSize: AVATAR_SIZE,
    avatarGap: AVATAR_GAP,
    avatarRowStep: 100,
    avatarStartY: 322,
    avatarSideInset: 58,
    avatarRowOffsetX: 0,
    deckTop: 380,
    deckHeight: 220,
    deckLabelY: 403,
    logoWidth: 130,
    logoHeight: 48,
    logoY: 32,
    greetingY: 246,
    greetingFontSize: 128,
  };
}

const escapeXml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const mimeFor = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'svg') return 'image/svg+xml';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/png';
};

async function dataUri(path: string, origin: string) {
  const cacheKey = `${origin}:${path}`;
  const cached = ASSET_CACHE.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    if (!path.startsWith('/')) return '';
    const response = await fetch(new URL(path, origin));
    if (!response.ok) return '';
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${mimeFor(path)};base64,${bytes.toString('base64')}`;
  })().catch(() => '');

  ASSET_CACHE.set(cacheKey, pending);
  return pending;
}

async function imageSize(path: string, origin: string) {
  const cacheKey = `${origin}:${path}`;
  const cached = IMAGE_SIZE_CACHE.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    if (!path.startsWith('/')) return { width: 0, height: 0 };
    try {
      const response = await fetch(new URL(path, origin));
      if (!response.ok) return { width: 0, height: 0 };
      const bytes = Buffer.from(await response.arrayBuffer());
      return readImageSize(bytes, path);
    } catch {
      return { width: 0, height: 0 };
    }
  })();
  IMAGE_SIZE_CACHE.set(cacheKey, pending);
  return pending;
}

function readImageSize(bytes: Buffer, path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  if (extension === 'png' && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (extension === 'gif' && bytes.length >= 10) {
    return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  }
  if (extension === 'svg') {
    const source = bytes.toString('utf8', 0, Math.min(bytes.length, 4096));
    const viewBox = source.match(/\bviewBox=["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i);
    const width = source.match(/\bwidth=["']([\d.]+)/i);
    const height = source.match(/\bheight=["']([\d.]+)/i);
    return {
      width: Number(width?.[1] || viewBox?.[1]) || 0,
      height: Number(height?.[1] || viewBox?.[2]) || 0,
    };
  }
  if (extension === 'webp' && bytes.length >= 30) {
    const kind = bytes.toString('ascii', 12, 16);
    if (kind === 'VP8X') {
      return {
        width: 1 + bytes.readUIntLE(24, 3),
        height: 1 + bytes.readUIntLE(27, 3),
      };
    }
    if (kind === 'VP8 ' && bytes.length >= 30) {
      return {
        width: bytes.readUInt16LE(26) & 0x3fff,
        height: bytes.readUInt16LE(28) & 0x3fff,
      };
    }
    if (kind === 'VP8L' && bytes.length >= 25) {
      const bits = bytes.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if ((extension === 'jpg' || extension === 'jpeg') && bytes.length > 4) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
      }
      if (length < 2) break;
      offset += length + 2;
    }
  }
  return { width: 0, height: 0 };
}

async function inlineSvg(path: string, origin: string) {
  if (!path.startsWith('/')) return '';
  try {
    const response = await fetch(new URL(path, origin));
    if (!response.ok) return '';
    return (await response.text())
      .replace(/<\?xml[^>]*>/i, '')
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<svg\b([^>]*)>/i, (_, attrs: string) => {
        const clean = attrs
          .replace(/\s(?:width|height)=("[^"]*"|'[^']*')/gi, '')
          .replace(/\s(?:x|y)=("[^"]*"|'[^']*')/gi, '')
          .replace(/\s+xmlns(?::[\w.-]+)?=("[^"]*"|'[^']*')/gi, '');
        return `<svg width="24" height="24"${clean}>`;
      })
      .replace(/\s([\w:.-]+)=([^"'\s][^\s>]*)/g, ' $1="$2"')
      .replace(/\s+style="([^"]*)"/g, (_match, style: string) => ` style="${style.replace(/'/g, '&apos;')}"`);
  } catch {
    return '';
  }
}

function mulberry32(seed: number) {
  return () => {
    let value = seed += 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromDate(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shanghaiDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function wrapText(value: string, maxUnits: number, maxLines: number) {
  const lines: string[] = [];
  for (const paragraph of String(value).split(/\r?\n/)) {
    let line = '';
    let units = 0;
    for (const character of Array.from(paragraph)) {
      const weight = /[\u2e80-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/u.test(character)
        ? 1
        : character === ' '
          ? 0.34
          : 0.56;
      if (line && units + weight > maxUnits) {
        lines.push(line);
        line = character;
        units = weight;
      } else {
        line += character;
        units += weight;
      }
      if (lines.length >= maxLines) break;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length >= maxLines) break;
  }
  if (!lines.length) lines.push('');
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (Array.from(last).length > maxUnits - 2) {
      lines[maxLines - 1] = `${Array.from(last).slice(0, Math.max(1, maxUnits - 2)).join('')}...`;
    }
  }
  return lines;
}

function resolveMessages(messages: HeroImageMessage[], scene: string) {
  return messages.map((message) => {
    if (message.type !== 'customize-msg') return message;
    const overrides = message.overrides || {};
    return {
      type: 'text' as const,
      content: (scene ? overrides[scene] : '') || message.default,
    };
  });
}

function drawAvatar(
  profile: SocialProfile,
  x: number,
  y: number,
  count: number,
  theme: Theme,
  geometry: HeroGeometry,
) {
  const avatarSize = geometry.avatarSize;
  const compact = avatarSize < 80;
  const ring = compact ? 2.64 : 4;
  const badge = compact ? 25.52 : 32;
  const inset = compact ? 4.4 : 5;
  const badgeX = x + avatarSize - badge + inset;
  const badgeY = y + avatarSize - badge + (compact ? 2.64 : 3);
  return `
    <g>
      <clipPath id="avatar-clip-${escapeXml(profile.id)}-${count}">
        <circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" />
      </clipPath>
      <circle cx="${x + avatarSize / 2}" cy="${y + avatarSize / 2}" r="${avatarSize / 2}" fill="${theme.avatarPlaceholder}" />
      <image
        href="${profile.avatarData}"
        x="${x}" y="${y}" width="${avatarSize}" height="${avatarSize}"
        clip-path="url(#avatar-clip-${escapeXml(profile.id)}-${count})"
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx="${badgeX + badge / 2}" cy="${badgeY + badge / 2}" r="${badge / 2}" fill="${theme.avatarBadge}" stroke="${theme.avatarBadge}" stroke-width="${ring}" />
      ${profile.iconMarkup
        ? `<g transform="translate(${badgeX + badge * 0.15625} ${badgeY + badge * 0.15625}) scale(${badge * 0.6875 / 24})"${theme.invertIcons && INVERT_ICON_IDS.has(profile.id) ? ' filter="url(#icon-invert)"' : ''}>${profile.iconMarkup}</g>`
        : ''}
    </g>`;
}

function drawMessage(
  message: Exclude<HeroImageMessage, { type: 'customize-msg' }>,
  index: number,
  y: number,
  imageData: string,
  sourceSize: { width: number; height: number },
  imageScale: number,
  isLastText: boolean,
  theme: Theme,
  geometry: HeroGeometry,
  fadeImage: boolean,
) {
  const left = geometry.chatX + geometry.chatContentX;
  if (message.type === 'text') {
    const lines = wrapText(message.content, geometry.messageTextUnits, 4);
    const textWidth = Math.max(...lines.map((line) => Array.from(line).length)) * geometry.messageFontSize;
    const padding = geometry.messagePaddingLeft + geometry.messagePaddingRight;
    const width = Math.min(
      geometry.chatMessageMaxWidth,
      geometry.chatContentWidth,
      Math.max(96, textWidth + padding),
    );
    const height = lines.length * geometry.messageLineHeight + 16;
    const bottomLeftRadius = isLastText ? 8 : 18;
    return {
      height,
      markup: `
        <path d="M${left + 18} ${y} H${left + width - 18} Q${left + width} ${y} ${left + width} ${y + 18} V${y + height - 18} Q${left + width} ${y + height} ${left + width - 18} ${y + height} H${left + bottomLeftRadius} Q${left} ${y + height} ${left} ${y + height - bottomLeftRadius} V${y + 18} Q${left} ${y} ${left + 18} ${y} Z" fill="${theme.chatMessage}" />
        ${lines.map((line, lineIndex) => `
          <text x="${left + geometry.messagePaddingLeft}" y="${y + 9 + geometry.messageFontSize + lineIndex * geometry.messageLineHeight}" fill="${theme.chatText}"
            font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="${geometry.messageFontSize}" font-weight="600">${escapeXml(line)}</text>
        `).join('')}
      `,
    };
  }

  if (message.type === 'image') {
    const ratio = sourceSize.width > 0 && sourceSize.height > 0
      ? Math.min(geometry.chatImageMaxWidth / sourceSize.width, 1) * imageScale
      : 0;
    const width = Math.max(1, Math.round(sourceSize.width * ratio));
    const height = Math.max(1, Math.round(sourceSize.height * ratio));
    return {
      height: height + 4,
      markup: imageData
        ? `<clipPath id="message-image-clip-${index}"><rect x="${left}" y="${y}" width="${width}" height="${height}" rx="18" /></clipPath>
           <image href="${imageData}" x="${left}" y="${y}" width="${width}" height="${height}" clip-path="url(#message-image-clip-${index})" preserveAspectRatio="xMidYMid meet" />
           ${fadeImage ? `<rect x="${left}" y="${y + Math.max(0, height - 64)}" width="${width}" height="${Math.min(64, height)}" fill="url(#message-image-fade)" />` : ''}`
        : '',
    };
  }

  const label = wrapText(message.label || message.href, 36, 1)[0];
  const width = Math.min(geometry.chatContentWidth, Math.max(120, Array.from(label).length * 16 + 40));
  const buttonX = left;
  return {
    height: 46,
    markup: `
      <defs>
      </defs>
      <g filter="url(#pill-shadow)">
      <rect x="${buttonX}" y="${y}" width="${width}" height="44" rx="23" fill="${theme.pillBackground}" fill-opacity="${theme.pillBackgroundOpacity}" stroke="url(#pill-border)" stroke-width="2" />
      <text x="${buttonX + width / 2}" y="${y + 22}" text-anchor="middle" dominant-baseline="middle" fill="${theme.pillIcon}"
        font-family="Sarasa SC, Geist, sans-serif" font-size="16" font-weight="700">${escapeXml(label)}</text>
      </g>
    `,
  };
}

export const GET: APIRoute = async ({ request, url }) => {
  const rawLang = url.searchParams.get('lang') || 'zh-cn';
  const lang = rawLang === 'en' ? 'en' : 'zh-cn';
  const rawTheme = url.searchParams.get('theme') || 'light';
  if (rawTheme !== 'light' && rawTheme !== 'dark') {
    return new Response('Invalid theme. Expected light or dark.', { status: 400 });
  }
  const theme = themes[rawTheme];
  const rawLayout = url.searchParams.get('layout') || 'wide';
  if (rawLayout !== 'wide' && rawLayout !== 'compact') {
    return new Response('Invalid layout. Expected wide or compact.', { status: 400 });
  }
  const layout = rawLayout;
  const geometry = geometryFor(layout);
  const rawDate = url.searchParams.get('date') || shanghaiDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate))) {
    return new Response('Invalid date. Expected YYYY-MM-DD.', { status: 400 });
  }
  const scene = (url.searchParams.get('scene') || '').slice(0, 48);
  if (scene && !/^[a-z0-9-]+$/.test(scene)) {
    return new Response('Invalid scene. Use lowercase letters, digits, and hyphens.', { status: 400 });
  }

  const data = homeDialogue.heroImage?.[lang];
  if (!data) return new Response('Hero image content is not configured.', { status: 404 });

  const random = mulberry32(seedFromDate(`${rawDate}:${lang}`));
  const rows = buildDeckRows(socialProfiles, avatarDeckLayout, random).slice(0, 3);
  const portraitIds = rows.flat();
  const origin = new URL(request.url).origin;
  const shareAvatar = (path: string) =>
    `/images/hero/share/${path.split('/').pop()?.replace(/\.[^.]+$/, '')}.webp`;
  const [logoData, ...portraitAssets] = await Promise.all([
    dataUri(`/images/hero/share/rinlit-logo${rawTheme === 'dark' ? '-dark' : ''}.webp`, origin),
    ...portraitIds.map(async (profile) => {
      const avatar = profile.avatar;
      return {
        ...profile,
        avatar,
        avatarData: await dataUri(shareAvatar(avatar), origin),
        iconMarkup: await inlineSvg(profile.icon, origin),
      };
    }),
  ]);
  const visible = portraitAssets;

  const messages = resolveMessages(data.messages, scene).slice(0, 8);
  const lastTextIndex = messages.reduce((last, message, index) => message.type === 'text' ? index : last, -1);
  const imagePaths = messages
    .filter((message): message is Extract<HeroImageMessage, { type: 'image' }> => message.type === 'image')
    .map((message) => message.src);
  const [imageData, imageSizes] = await Promise.all([
    Promise.all(imagePaths.map((path) => dataUri(path, origin))),
    Promise.all(imagePaths.map((path) => imageSize(path, origin))),
  ]);
  const imageByPath = new Map(imagePaths.map((path, index) => [path, imageData[index]]));
  const imageSizeByPath = new Map(imagePaths.map((path, index) => [path, imageSizes[index]]));

  const messageTop = geometry.messageTop;
  const imageMessages = messages.filter(
    (message): message is Extract<HeroImageMessage, { type: 'image' }> => message.type === 'image',
  );
  const availableImageHeight = Math.max(1, geometry.chatMessagesBottom - messageTop);
  const naturalImageHeight = imageMessages.reduce((height, message) => {
    const size = imageSizeByPath.get(message.src) || { width: 0, height: 0 };
    if (!size.width || !size.height) return height;
    return height + size.height * Math.min(geometry.chatImageMaxWidth / size.width, 1);
  }, 0);
  const imageScale = naturalImageHeight > availableImageHeight
    ? availableImageHeight / naturalImageHeight
    : 1;
  const imageClipBottom = geometry.chatMessagesBottom;
  const imageNeedsScroll = messages.some((message, index) => {
    if (message.type !== 'image') return false;
    const size = imageSizeByPath.get(message.src) || { width: 0, height: 0 };
    if (!size.width || !size.height) return false;
    const imageHeight = size.height * Math.min(geometry.chatImageMaxWidth / size.width, 1);
    const priorHeight = messages.slice(0, index).reduce((height, prior) => {
      if (prior.type === 'text') {
        return height + wrapText(prior.content, geometry.messageTextUnits, 4).length * geometry.messageLineHeight + 16;
      }
      return height + (prior.type === 'image' ? 0 : 46);
    }, 0);
    return messageTop + priorHeight + imageHeight + geometry.messageGap > imageClipBottom;
  });
  let messageY = geometry.chatY + messageTop;
  let messageIndex = 0;
  const messageMarkup = messages.map((message) => {
    const rendered = drawMessage(
      message,
      messageIndex++,
      messageY,
      message.type === 'image' ? imageByPath.get(message.src) || '' : '',
      message.type === 'image' ? imageSizeByPath.get(message.src) || { width: 0, height: 0 } : { width: 0, height: 0 },
      imageScale,
      message.type === 'text' && messageIndex - 1 === lastTextIndex,
      theme,
      geometry,
      imageNeedsScroll && message.type === 'image',
    );
    messageY += rendered.height + geometry.messageGap;
    return rendered.markup;
  }).join('');

  const avatarMarkup: string[] = [];
  let avatarIndex = 0;
  rows.forEach((row, rowIndex) => {
    const count = row.length;
    const sideInset = rowIndex === 0 ? geometry.avatarSideInset : 0;
    const rowWidth = count * geometry.avatarSize + (count - 1) * geometry.avatarGap + sideInset * 2;
    let x = (geometry.cardWidth - rowWidth) / 2 + geometry.avatarRowOffsetX + sideInset;
    const y = geometry.avatarStartY + rowIndex * geometry.avatarRowStep;
    for (let index = 0; index < count; index += 1) {
      const profile = visible[avatarIndex++];
      if (profile) avatarMarkup.push(drawAvatar(profile, x, y, avatarIndex, theme, geometry));
      x += geometry.avatarSize + geometry.avatarGap;
    }
  });

  const deckLabel = t(lang, 'social.deckLabel');
  const prompt = lang === 'en' ? "Visit 'rinlit.cn' to learn more about me" : "在 'rinlit.cn' 与我了解更多";
  const composerX = geometry.chatX + (geometry.chatWidth - geometry.composerWidth) / 2;
  const promptWidth = geometry.composerWidth - geometry.sendSize - geometry.composerGap;
  const composerTop = geometry.chatY + geometry.chatHeight - geometry.composerBottom - geometry.sendSize;
  const sendCenterX = composerX + promptWidth + geometry.composerGap + geometry.sendSize / 2;
  const sendRadius = geometry.sendSize / 2;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.viewWidth}" height="${geometry.viewHeight}" viewBox="0 0 ${geometry.viewWidth} ${geometry.viewHeight}" role="img" aria-label="RinLit hero">
  <defs>
    <linearGradient id="pill-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0" stop-color="${theme.pillBorder}" stop-opacity="${theme.pillBorderOpacity}" />
      <stop offset=".46" stop-color="${theme.pillBorder}" stop-opacity="0" />
      <stop offset=".56" stop-color="${theme.pillBorder}" stop-opacity="0" />
      <stop offset="1" stop-color="${theme.pillBorder}" stop-opacity="${theme.pillBorderOpacity}" />
    </linearGradient>
    <filter id="pill-shadow" x="-20%" y="-30%" width="140%" height="180%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity=".08" />
    </filter>
    <filter id="icon-invert" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0" />
    </filter>
    <clipPath id="card-clip"><rect width="${geometry.cardWidth}" height="${geometry.cardHeight}" rx="${geometry.cardRadius}" /></clipPath>
    <clipPath id="chat-clip"><rect x="${geometry.chatX}" y="${geometry.chatY}" width="${geometry.chatWidth}" height="${geometry.chatHeight}" rx="${geometry.chatRadius}" /></clipPath>
    <clipPath id="chat-messages-clip"><rect x="${geometry.chatX}" y="${geometry.chatY + geometry.chatMessagesTop}" width="${geometry.chatWidth}" height="${geometry.chatMessagesBottom - geometry.chatMessagesTop}" /></clipPath>
    <clipPath id="social-deck-clip"><rect x="0" y="${geometry.deckTop}" width="${geometry.cardWidth}" height="${geometry.deckHeight}" /></clipPath>
    <linearGradient id="deck-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.card}" />
      <stop offset=".72" stop-color="${theme.card}" stop-opacity=".72" />
      <stop offset="1" stop-color="${theme.card}" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="message-image-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.chat}" stop-opacity="0" />
      <stop offset="1" stop-color="${theme.chat}" />
    </linearGradient>
  </defs>

  <rect width="${geometry.cardWidth}" height="${geometry.cardHeight}" rx="${geometry.cardRadius}" fill="${theme.card}" />
  <g clip-path="url(#card-clip)">
    ${logoData ? `<image href="${logoData}" x="${(geometry.cardWidth - geometry.logoWidth) / 2}" y="${geometry.logoY}" width="${geometry.logoWidth}" height="${geometry.logoHeight}" preserveAspectRatio="xMidYMid meet" />` : ''}
    <text x="${geometry.cardWidth / 2}" y="${geometry.greetingY}" text-anchor="middle" fill="${theme.cardText}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="${geometry.greetingFontSize}" font-weight="700">${lang === 'en' ? 'Hello' : '你好'}</text>
    <g clip-path="url(#social-deck-clip)">
      ${avatarMarkup.join('')}
      <rect x="0" y="${geometry.deckTop}" width="${geometry.cardWidth}" height="66" fill="url(#deck-fade)" />
      <text x="${geometry.cardWidth / 2}" y="${geometry.deckLabelY}" text-anchor="middle" fill="${theme.deckText}" stroke="${theme.card}" stroke-width="5" paint-order="stroke"
        font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="16" font-weight="600">${escapeXml(deckLabel)}</text>
    </g>
  </g>

  <rect x="${geometry.chatX}" y="${geometry.chatY}" width="${geometry.chatWidth}" height="${geometry.chatHeight}" rx="${geometry.chatRadius}" fill="${theme.chat}" />
  <g clip-path="url(#chat-clip)">
    <rect x="${geometry.chatX + geometry.chatInset}" y="${geometry.chatY + 24}" width="${geometry.chatWidth - geometry.chatInset * 2}" height="42" rx="18" fill="${theme.chatHeader}" />
    <text x="${geometry.chatX + geometry.chatWidth / 2}" y="${geometry.chatY + 51}" text-anchor="middle" fill="${theme.chatText}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="17" font-weight="700">Chat with RinLit</text>
    <text x="${geometry.chatX + geometry.chatWidth / 2}" y="${geometry.chatY + 95}" text-anchor="middle" fill="${theme.chatMuted}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="14" font-weight="600">${escapeXml(data.time || (lang === 'en' ? 'Now' : '现在'))}</text>
    <g clip-path="url(#chat-messages-clip)">${messageMarkup}</g>
    <g filter="url(#pill-shadow)">
      <rect x="${composerX}" y="${composerTop}" width="${promptWidth}" height="40" rx="20" fill="${theme.pillBackground}" fill-opacity="${theme.pillBackgroundOpacity}" stroke="url(#pill-border)" stroke-width="2" />
      <text x="${composerX + 20}" y="${composerTop + 27}" fill="${theme.composerText}" fill-opacity=".62"
        font-family="Sarasa SC, Geist, sans-serif" font-size="15" font-weight="700">${escapeXml(prompt)}</text>
    </g>
    <g filter="url(#pill-shadow)">
      <circle cx="${sendCenterX}" cy="${composerTop + sendRadius}" r="${sendRadius}" fill="${theme.primaryPill}" fill-opacity="${theme.primaryPillOpacity}" stroke="url(#pill-border)" stroke-width="1.5" />
      <path d="M${sendCenterX} ${composerTop + 12} L${sendCenterX} ${composerTop + 28} M${sendCenterX - 5} ${composerTop + 17} L${sendCenterX} ${composerTop + 12} L${sendCenterX + 5} ${composerTop + 17}"
        fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      'x-hero-card-date': rawDate,
      'x-hero-card-scene': scene || 'default',
      'x-hero-card-theme': rawTheme,
      'x-hero-card-layout': layout,
    },
  });
};
