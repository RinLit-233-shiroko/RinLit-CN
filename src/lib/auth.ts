import type { AstroCookies } from "astro";
import { createServerClient } from "./supabase";

/**
 * 从请求 cookies 中读取 Supabase 服务端 session。
 * 用于 Astro SSR 页面中判断登录状态。
 *
 * 用法（在 .astro frontmatter 中）:
 *   const user = await getSessionUser(Astro.cookies);
 *   if (user) { ... }
 */
export async function getSessionUser(cookies: AstroCookies) {
    const supabase = createServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    return user ?? null;
}
