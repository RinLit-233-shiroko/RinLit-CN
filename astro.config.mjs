import { defineConfig } from 'astro/config';
import edgeoneAdapter from '@edgeone/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rinlit.cn',

  vite: {
    build: {
      cssMinify: false,
    },
  },

  i18n: {
    locales: ['en', 'zh-cn'],
    defaultLocale: 'zh-cn',
    routing: {
      prefixDefaultLocale: true,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'zh-cn',
        // 在 sitemap 中为各语言版本生成 hreflang 关联
        locales: { 'zh-cn': 'zh-CN', en: 'en-US' },
      },
      // SSR 页面不会自动进入 sitemap，手动补充
      customPages: [
        'https://rinlit.cn/zh-cn/gallery',
        'https://rinlit.cn/en/gallery',
        'https://rinlit.cn/zh-cn/gallery/favorites',
        'https://rinlit.cn/en/gallery/favorites',
      ],
    }),
  ],

  // Keep hybrid rendering: static pages stay prerendered, while pages with
  // `prerender = false` run through EdgeOne's server runtime.
  output: 'server',
  adapter: edgeoneAdapter({
    outDir: '.edgeone',

    // PWA 相关响应头。headerRoutes 会被放在 filesystem 处理之前并 `continue: true`，
    // 因此这些规则对 public/ 下的静态文件同样生效。
    headers: [
      {
        // Service Worker 必须每次校验，否则用户会长期停留在旧版本上。
        source: '/sw.js',
        headers: {
          'cache-control': 'no-cache, no-store, must-revalidate',
          'service-worker-allowed': '/',
        },
      },
      {
        // 清单文件同样需要及时更新，且部分 CDN 不认识 .webmanifest 扩展名。
        source: '/manifest.webmanifest',
        headers: {
          'content-type': 'application/manifest+json; charset=utf-8',
          'cache-control': 'no-cache',
        },
      },
      {
        // 离线兜底页由 Service Worker 预缓存，保持可校验即可。
        source: '/offline.html',
        headers: {
          'cache-control': 'no-cache',
        },
      },
      {
        // 图标使用固定文件名（不带内容哈希），因此不能用 immutable：
        // 一天后允许后台校验，换图标时能自然失效。
        source: '/icons/(.*)',
        headers: {
          'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      },
    ],
  }),
});
