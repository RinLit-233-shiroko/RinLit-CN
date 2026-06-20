import { createServerClient } from "./supabase";
import type { GalleryItem, Writing, GalleryItemStatus } from "./database.types";

// ============ Gallery Items ============

export async function getGalleryItems(language: string, status: GalleryItemStatus = 'published') {
    const supabase = createServerClient();
    return await supabase
        .from('gallery_items')
        .select('*')
        .eq('language', language)
        .eq('status', status)
        .order('created_at', { ascending: false });
}

export async function getGalleryItemById(id: string) {
    const supabase = createServerClient();
    return await supabase
        .from('gallery_items')
        .select('*')
        .eq('id', id)
        .single();
}

export async function getGalleryItemsByUserId(userId: string) {
    const supabase = createServerClient();
    return await supabase
        .from('gallery_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
}

// ============ Writings ============

export async function getWritings(language: string, status: GalleryItemStatus = 'published') {
    const supabase = createServerClient();
    return await supabase
        .from('writings')
        .select('*')
        .eq('language', language)
        .eq('status', status)
        .order('created_at', { ascending: false });
}

export async function getWritingBySlug(slug: string) {
    const supabase = createServerClient();
    return await supabase
        .from('writings')
        .select('*')
        .eq('slug', slug)
        .single();
}

export async function getWritingById(id: string) {
    const supabase = createServerClient();
    return await supabase
        .from('writings')
        .select('*')
        .eq('id', id)
        .single();
}
