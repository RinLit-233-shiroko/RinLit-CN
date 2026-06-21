import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export async function resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = getClient();
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signInWithGithub() {
    const supabase = getClient();
    return await supabase.auth.signInWithOAuth({
        provider: 'github',
    });
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
