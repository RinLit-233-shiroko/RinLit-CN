import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY

let client: SupabaseClient<Database> | null = null;

export function createServerClient(): SupabaseClient<Database> {
    if (client) return client;

    client = createClient<Database>(
        supabaseUrl,
        supabasePublishableKey
    );

    return client;
}
