import { defineConfig } from 'astro/config';

export default defineConfig({
  i18n: {
    locales: ['en', 'zh-cn'],
    defaultLocale: 'zh-cn',
    routing: {
      prefixDefaultLocale: true,
    },
  },

  output: "static",
});
