import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

let client: SupabaseClient<Database> | null = null;
let adminClient: SupabaseClient<Database> | null = null;

export function createServerClient(): SupabaseClient<Database> {
    if (client) return client;

    client = createClient<Database>(
        supabaseUrl,
        supabasePublishableKey
    );

    return client;
}

export function createAdminClient(): SupabaseClient<Database> | null {
    if (!supabaseServiceRoleKey) return null;
    if (adminClient) return adminClient;

    adminClient = createClient<Database>(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    return adminClient;
}
