import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    if (client) return client;
    client = createClient(supabaseUrl, supabasePublishableKey);
    return client;
}

export async function signUp(email: string, password: string) {
    const supabase = getClient();
    return await supabase.auth.signUp({ email, password });
}

export async function signIn(email: string, password: string) {
    const supabase = getClient();
    return await supabase.auth.signInWithPassword({ email, password });
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
    const supabase = getClient();
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
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
