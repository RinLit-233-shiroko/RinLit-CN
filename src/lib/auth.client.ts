import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AccountRole } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (client) return client;
    client = createClient(supabaseUrl, supabasePublishableKey);
    return client;
}

export async function signUp(email: string, password: string, displayName?: string) {
    const supabase = getClient();
    const options: any = {};
    if (displayName) {
        options.data = { display_name: displayName };
    }
    return await supabase.auth.signUp({ email, password, options });
}

export async function signIn(email: string, password: string) {
    const supabase = getClient();
    return await supabase.auth.signInWithPassword({ email, password });
}

export async function sendEmailOtp(email: string) {
    const supabase = getClient();
    return await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
    });
}

export async function verifyEmailOtp(email: string, token: string) {
    const supabase = getClient();
    return await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    });
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = getClient();
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signInWithGithub(redirectTo?: string) {
    const supabase = getClient();
    return await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: redirectTo ? { redirectTo } : undefined,
    });
}

export async function linkGithubIdentity(redirectTo?: string) {
    const supabase = getClient();
    return await supabase.auth.linkIdentity({
        provider: 'github',
        options: redirectTo ? { redirectTo } : undefined,
    });
}

export async function unlinkIdentity(identity: any) {
    const supabase = getClient();
    return await supabase.auth.unlinkIdentity(identity);
}

export async function updateDisplayName(displayName: string) {
    const supabase = getClient();
    return await supabase.auth.updateUser({
        data: { display_name: displayName },
    });
}

export async function updateEmail(email: string) {
    const supabase = getClient();
    return await supabase.auth.updateUser({ email });
}

export async function updatePassword(password: string) {
    const supabase = getClient();
    return await supabase.auth.updateUser({ password });
}

export async function verifyPassword(email: string, password: string) {
    const supabase = getClient();
    return await supabase.auth.signInWithPassword({ email, password });
}

export async function refreshSession() {
    const supabase = getClient();
    return await supabase.auth.refreshSession();
}

export async function getUser() {
    const supabase = getClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
}

export async function getUserRoles(userId: string) {
    const supabase = getClient();
    return await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
}

/**
 * 返回用户持有的全部角色（来自 user_roles 表）。
 */
export async function getUserEffectiveRoles(userId: string): Promise<{ roles: AccountRole[]; error: any }> {
    const { data, error } = await getUserRoles(userId);
    const roles = new Set<AccountRole>();
    if (data) {
        for (const row of data) {
            if (row?.role) roles.add(row.role as AccountRole);
        }
    }
    return { roles: Array.from(roles), error };
}

/**
 * 判断用户是否持有指定角色（查询 user_roles）。
 * 出错时返回 false（对审核类入口采用 fail-closed）。
 */
export async function hasRole(userId: string, role: AccountRole): Promise<boolean> {
    const { roles } = await getUserEffectiveRoles(userId);
    return roles.includes(role);
}

export async function signOut() {
    const supabase = getClient();
    return await supabase.auth.signOut();
}

export async function getSession() {
    const supabase = getClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * 监听 auth 状态变化（如 OAuth 弹窗登录后自动更新 UI）
 * 返回 unsubscribe 函数
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
    const supabase = getClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
    return data.subscription.unsubscribe;
}
