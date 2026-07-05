import { defineConfig } from 'astro/config';
import node from "@astrojs/node";

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  i18n: {
    locales: ['en', 'zh-cn'],
    defaultLocale: 'zh-cn',
    routing: {
      prefixDefaultLocale: true,
    },
  },

  output: 'static',
  adapter: netlify(),
});