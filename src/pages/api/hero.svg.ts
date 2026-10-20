import type { APIRoute } from 'astro';
import { avatarDeckLayout, buildDeckRows } from '../../data/home/deck';
import { homeDialogue, type HeroImageMessage } from '../../data/home/dialogue';
import { socialProfiles, type SocialProfile } from '../../data/home/socials';
import { t } from '../../i18n/index';

export const prerender = false;

const CARD_WIDTH = 400;
const CHAT_WIDTH = 856;
const CARD_HEIGHT = 600;
const GAP = 32;
const VIEWBOX_WIDTH = CARD_WIDTH + GAP + CHAT_WIDTH;
const CHAT_X = CARD_WIDTH + GAP;
const CHAT_INSET = 24;
const CHAT_CONTENT_WIDTH = 640;
const CHAT_CONTENT_X = CHAT_X + (CHAT_WIDTH - CHAT_CONTENT_WIDTH) / 2 + 16;
const CHAT_MESSAGE_MAX_WIDTH = 500;
const CHAT_IMAGE_MAX_WIDTH = 385;
const CHAT_MESSAGES_TOP = 108;
const CHAT_MESSAGES_BOTTOM = 508;
const MESSAGE_GAP = 10;
const AVATAR_SIZE = 84;
const AVATAR_GAP = 24;
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
    pillIcon: '#101216',
    primaryPill: '#8c7ecd',
    primaryPillOpacity: '.6',
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
    pillIcon: '#ffffff',
    primaryPill: '#8c7ecd',
    primaryPillOpacity: '.48',
  },
} as const;

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
          .replace(/\s(?:x|y)=("[^"]*"|'[^']*')/gi, '');
        return `<svg width="24" height="24" ${clean}>`;
      });
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

function drawAvatar(profile: SocialProfile, x: number, y: number, count: number, theme: typeof themes.light | typeof themes.dark) {
  const ring = 4;
  const badge = 32;
  const badgeX = x + AVATAR_SIZE - badge + 5;
  const badgeY = y + AVATAR_SIZE - badge + 3;
  return `
    <g>
      <clipPath id="avatar-clip-${escapeXml(profile.id)}-${count}">
        <circle cx="${x + AVATAR_SIZE / 2}" cy="${y + AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" />
      </clipPath>
      <circle cx="${x + AVATAR_SIZE / 2}" cy="${y + AVATAR_SIZE / 2}" r="${AVATAR_SIZE / 2}" fill="${theme.avatarPlaceholder}" />
      <image
        href="${profile.avatarData}"
        x="${x}" y="${y}" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}"
        clip-path="url(#avatar-clip-${escapeXml(profile.id)}-${count})"
        preserveAspectRatio="xMidYMid slice"
      />
      <circle cx="${badgeX + badge / 2}" cy="${badgeY + badge / 2}" r="${badge / 2}" fill="${theme.avatarBadge}" stroke="${theme.avatarBadge}" stroke-width="${ring}" />
      ${profile.iconMarkup
        ? `<g transform="translate(${badgeX + 5} ${badgeY + 5}) scale(${(badge - 10) / 24})">${profile.iconMarkup}</g>`
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
  theme: typeof themes.light | typeof themes.dark,
) {
  const left = CHAT_CONTENT_X;
  if (message.type === 'text') {
    const lines = wrapText(message.content, 30, 4);
    const width = Math.min(CHAT_MESSAGE_MAX_WIDTH, Math.max(96, Math.max(...lines.map((line) => Array.from(line).length)) * 16 + 32));
    const height = lines.length * 22 + 16;
    const bottomLeftRadius = isLastText ? 8 : 18;
    return {
      height,
      markup: `
        <path d="M${left + 18} ${y} H${left + width - 18} Q${left + width} ${y} ${left + width} ${y + 18} V${y + height - 18} Q${left + width} ${y + height} ${left + width - 18} ${y + height} H${left + bottomLeftRadius} Q${left} ${y + height} ${left} ${y + height - bottomLeftRadius} V${y + 18} Q${left} ${y} ${left + 18} ${y} Z" fill="${theme.chatMessage}" />
        ${lines.map((line, lineIndex) => `
          <text x="${left + 16}" y="${y + 25 + lineIndex * 22}" fill="${theme.chatText}"
            font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="16" font-weight="600">${escapeXml(line)}</text>
        `).join('')}
      `,
    };
  }

  if (message.type === 'image') {
    const ratio = sourceSize.width > 0 && sourceSize.height > 0
      ? Math.min(CHAT_IMAGE_MAX_WIDTH / sourceSize.width, 1) * imageScale
      : 0;
    const width = Math.max(1, Math.round(sourceSize.width * ratio));
    const height = Math.max(1, Math.round(sourceSize.height * ratio));
    return {
      height: height + 4,
      markup: imageData
        ? `<clipPath id="message-image-clip-${index}"><rect x="${left}" y="${y}" width="${width}" height="${height}" rx="18" /></clipPath>
           <image href="${imageData}" x="${left}" y="${y}" width="${width}" height="${height}" clip-path="url(#message-image-clip-${index})" preserveAspectRatio="xMidYMid meet" />`
        : '',
    };
  }

  const label = wrapText(message.label || message.href, 36, 1)[0];
  const width = Math.min(CHAT_CONTENT_WIDTH, Math.max(120, Array.from(label).length * 16 + 40));
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

  const messageTop = 122;
  const imageMessages = messages.filter(
    (message): message is Extract<HeroImageMessage, { type: 'image' }> => message.type === 'image',
  );
  const fixedMessageHeight = messages.reduce((height, message) => {
    if (message.type === 'text') return height + wrapText(message.content, 30, 4).length * 22 + 16;
    return height + (message.type === 'image' ? 0 : 46);
  }, 0);
  const availableImageHeight = Math.max(
    1,
    CHAT_MESSAGES_BOTTOM - messageTop - fixedMessageHeight - Math.max(0, messages.length - 1) * MESSAGE_GAP,
  );
  const naturalImageHeight = imageMessages.reduce((height, message) => {
    const size = imageSizeByPath.get(message.src) || { width: 0, height: 0 };
    if (!size.width || !size.height) return height;
    return height + size.height * Math.min(CHAT_IMAGE_MAX_WIDTH / size.width, 1);
  }, 0);
  const imageScale = naturalImageHeight > availableImageHeight
    ? availableImageHeight / naturalImageHeight
    : 1;
  let messageY = messageTop;
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
    );
    messageY += rendered.height + MESSAGE_GAP;
    return rendered.markup;
  }).join('');

  const avatarMarkup: string[] = [];
  let avatarIndex = 0;
  rows.forEach((row, rowIndex) => {
    const count = row.length;
    const sideInset = rowIndex === 0 ? 58 : 0;
    const rowWidth = count * AVATAR_SIZE + (count - 1) * AVATAR_GAP + sideInset * 2;
    let x = (CARD_WIDTH - rowWidth) / 2 + sideInset;
    const y = 322 + rowIndex * 100;
    for (let index = 0; index < count; index += 1) {
      const profile = visible[avatarIndex++];
      if (profile) avatarMarkup.push(drawAvatar(profile, x, y, avatarIndex, theme));
      x += AVATAR_SIZE + AVATAR_GAP;
    }
  });

  const deckLabel = t(lang, 'social.deckLabel');
  const prompt = lang === 'en' ? "Visit 'rinlit.cn' to learn more about me" : "在 'rinlit.cn' 与我了解更多";
  const composerWidth = 480;
  const composerX = CHAT_X + (CHAT_WIDTH - composerWidth) / 2;
  const promptWidth = composerWidth - 50;
  const composerTop = CARD_HEIGHT - CHAT_INSET - 40;
  const sendCenterX = composerX + promptWidth + 30;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${VIEWBOX_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${VIEWBOX_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="RinLit hero">
  <defs>
    <linearGradient id="pill-border" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0" stop-color="#ffffff" />
      <stop offset=".4567" stop-color="#ffffff" stop-opacity="0" />
      <stop offset=".5721" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="1" stop-color="#ffffff" />
    </linearGradient>
    <filter id="pill-shadow" x="-20%" y="-30%" width="140%" height="180%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity=".08" />
    </filter>
    <clipPath id="card-clip"><rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="26" /></clipPath>
    <clipPath id="chat-clip"><rect x="${CHAT_X}" width="${CHAT_WIDTH}" height="${CARD_HEIGHT}" rx="24" /></clipPath>
    <clipPath id="chat-messages-clip"><rect x="${CHAT_X}" y="${CHAT_MESSAGES_TOP}" width="${CHAT_WIDTH}" height="${CHAT_MESSAGES_BOTTOM - CHAT_MESSAGES_TOP}" /></clipPath>
    <clipPath id="social-deck-clip"><rect x="0" y="380" width="${CARD_WIDTH}" height="220" /></clipPath>
    <linearGradient id="deck-fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.card}" />
      <stop offset=".72" stop-color="${theme.card}" stop-opacity=".72" />
      <stop offset="1" stop-color="${theme.card}" stop-opacity="0" />
    </linearGradient>
  </defs>

  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="26" fill="${theme.card}" />
  <g clip-path="url(#card-clip)">
    ${logoData ? `<image href="${logoData}" x="${(CARD_WIDTH - 130) / 2}" y="32" width="130" height="48" preserveAspectRatio="xMidYMid meet" />` : ''}
    <text x="${CARD_WIDTH / 2}" y="246" text-anchor="middle" fill="${theme.cardText}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="128" font-weight="700">${lang === 'en' ? 'Hello' : '你好'}</text>
    <g clip-path="url(#social-deck-clip)">
      ${avatarMarkup.join('')}
      <rect x="0" y="380" width="${CARD_WIDTH}" height="66" fill="url(#deck-fade)" />
      <text x="${CARD_WIDTH / 2}" y="403" text-anchor="middle" fill="${theme.deckText}" stroke="${theme.card}" stroke-width="5" paint-order="stroke"
        font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="16" font-weight="600">${escapeXml(deckLabel)}</text>
    </g>
  </g>

  <rect x="${CHAT_X}" width="${CHAT_WIDTH}" height="${CARD_HEIGHT}" rx="24" fill="${theme.chat}" />
  <g clip-path="url(#chat-clip)">
    <rect x="${CHAT_X + CHAT_INSET}" y="24" width="${CHAT_WIDTH - CHAT_INSET * 2}" height="42" rx="18" fill="${theme.chatHeader}" />
    <text x="${CHAT_X + CHAT_WIDTH / 2}" y="51" text-anchor="middle" fill="${theme.chatText}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="17" font-weight="700">Chat with RinLit</text>
    <text x="${CHAT_X + CHAT_WIDTH / 2}" y="95" text-anchor="middle" fill="${theme.chatMuted}"
      font-family="Plus Jakarta Sans, Sarasa SC, sans-serif" font-size="14" font-weight="600">${escapeXml(data.time || (lang === 'en' ? 'Now' : '现在'))}</text>
    <g clip-path="url(#chat-messages-clip)">${messageMarkup}</g>
    <g filter="url(#pill-shadow)">
      <rect x="${composerX}" y="${composerTop}" width="${promptWidth}" height="40" rx="20" fill="${theme.pillBackground}" fill-opacity="${theme.pillBackgroundOpacity}" stroke="url(#pill-border)" stroke-width="2" />
      <text x="${composerX + 20}" y="${composerTop + 27}" fill="${theme.composerText}" fill-opacity=".62"
        font-family="Sarasa SC, Geist, sans-serif" font-size="15" font-weight="700">${escapeXml(prompt)}</text>
    </g>
    <g filter="url(#pill-shadow)">
      <circle cx="${sendCenterX}" cy="${composerTop + 20}" r="20" fill="${theme.primaryPill}" fill-opacity="${theme.primaryPillOpacity}" stroke="url(#pill-border)" stroke-width="1.5" />
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
    },
  });
};
