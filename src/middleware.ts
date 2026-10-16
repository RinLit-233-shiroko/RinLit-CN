import { defineMiddleware } from 'astro:middleware';
import { defaultLocale, locales, type Locale } from './i18n/index';

/**
 * 补齐缺失的语言前缀。
 *
 * astro.config.mjs 里 i18n.routing.prefixDefaultLocale 为 true，
 * Astro 只会生成 /zh-cn/fields 这样的地址，不会为 /fields 建路由，
 * 因此直接访问 /fields（或 /gallery、/me 等）会落到 404。
 *
 * 这里把所有不带语言前缀的请求 302 到默认语言：
 * /fields?x=1 → /zh-cn/fields?x=1
 */
export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;
  const [first] = pathname.split('/').filter(Boolean);

  // 根路径由 src/pages/index.astro 处理；已带语言前缀的路径正常放行。
  if (!first || locales.includes(first as Locale)) {
    return next();
  }

  // 静态文件（/favicon.ico、/sw.js、/icons/...）和 Astro 内部端点
  // （/_image、/_server-islands、/__edgeone_revalidate 等）不参与重定向。
  if (first.startsWith('_') || pathname.includes('.')) {
    return next();
  }

  return context.redirect(`/${defaultLocale}${pathname}${search}`, 302);
});
