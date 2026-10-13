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
  }),
});
