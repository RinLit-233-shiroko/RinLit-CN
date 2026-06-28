import { defineConfig } from 'astro/config';
import node from "@astrojs/node";

export default defineConfig({
  i18n: {
    locales: ['en', 'zh-cn'],
    defaultLocale: 'zh-cn',
    routing: {
      prefixDefaultLocale: true,
    },
  },

  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});
