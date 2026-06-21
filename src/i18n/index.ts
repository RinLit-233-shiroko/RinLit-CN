import en from './en.json';
import zhCn from './zh-cn.json';

export type Locale = 'en' | 'zh-cn';

const dict: Record<Locale, Record<string, string>> = {
  en,
  'zh-cn': zhCn,
};

export const locales: Locale[] = ['zh-cn', 'en'];

export const defaultLocale: Locale = 'zh-cn';

/**
 * 根据 locale 获取翻译文本
 * 用法: t(locale, 'nav.fields') => '领域' | 'Fields'
 */
export function t(locale: Locale | string | undefined, key: string): string {
  const localeKey = (locale || defaultLocale) as Locale;
  return dict[localeKey]?.[key] ?? key;
}

/**
 * 为组件提供绑定了 locale 的翻译函数
 */
export function useT(locale: string | undefined) {
  return (key: string) => t(locale, key);
}
