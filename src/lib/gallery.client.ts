import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AccountRole, Database, GalleryItemModerationRequestStatus, GalleryItemModerationRequestType, GalleryItemStatus } from "./database.types";

export const GALLERY_BUCKET = 'gallery';
export const GALLERY_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const GALLERY_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (client) return client;
  client = createClient<Database>(supabaseUrl, supabasePublishableKey);
  return client;
}

function normalizeTagName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function parseGalleryTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[，,\n]/)
    .map(normalizeTagName)
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || tag.length > 32 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function validateGalleryFile(file: File) {
  if (!file) return '请选择一张图片。';
  if (!GALLERY_ALLOWED_MIME_TYPES.includes(file.type)) return '图片格式仅支持 png、jpeg、jpg、webp、gif。';
  if (file.size > GALLERY_MAX_FILE_SIZE) return '图片大小不能超过 5MB。';
  return '';
}

function getStorageExtension(file: File) {
  const extension = file.name.split('.').pop()?.trim().toLowerCase();
  if (extension && ['png', 'jpeg', 'jpg', 'webp', 'gif'].includes(extension)) return extension;
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpg';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'png';
}

async function getImageDimensions(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error('无法读取图片尺寸。'));
      image.src = imageUrl;
    });

    if (!dimensions.width || !dimensions.height) throw new Error('无法读取图片尺寸。');
    return dimensions;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function ensureGalleryTags(supabase: SupabaseClient<Database>, names: string[]) {
  if (!names.length) return [];

  // 1. 精确匹配查询已存在的标签
  const { data: exactExisting, error: queryError } = await supabase
    .from('gallery_tags')
    .select('id,name')
    .in('name', names);

  if (queryError) throw queryError;

  // 构建大小写不敏感映射（用于处理 "Concept" vs "concept"）
  const existingMap = new Map<string, { id: string; name: string }>();
  for (const tag of exactExisting || []) {
    existingMap.set(tag.name.toLowerCase(), tag);
  }

  // 2. 过滤出数据库中完全不存在的标签（大小写不敏感）
  const newNames = names.filter(name => !existingMap.has(name.toLowerCase()));

  if (newNames.length) {
    // 内部再按小写去重，防止 "Tag" 和 "TAG" 同时入库
    const seen = new Set<string>();
    const uniqueNewNames = newNames.filter(n => {
      const key = n.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const { error: insertError } = await supabase
      .from('gallery_tags')
      .insert(uniqueNewNames.map(name => ({ name })));

    if (insertError) throw insertError;
  }

  // 3. 重新查询所有匹配的标签（新插入的也需要拿到 id）
  const allSearchNames = [...new Set(names.map(n => n))]; // 去重保留原名
  const { data: allTags, error: fetchError } = await supabase
    .from('gallery_tags')
    .select('id,name')
    .in('name', allSearchNames);

  if (fetchError) throw fetchError;

  // 4. 按传入顺序、大小写不敏感返回匹配结果
  const allMap = new Map<string, { id: string; name: string }>();
  for (const tag of allTags || []) {
    allMap.set(tag.name.toLowerCase(), tag);
  }

  return names
    .map(name => allMap.get(name.toLowerCase()))
    .filter(Boolean) as { id: string; name: string }[];
}

export async function fetchGalleryTagSuggestions(limit = 100) {
  const supabase = getClient();
  return await supabase
    .from('gallery_tags')
    .select('id,name')
    .order('name', { ascending: true })
    .limit(limit);
}

export async function fetchPublishedGalleryItems() {
  const supabase = getClient();
  return await supabase
    .from('gallery_items')
    .select('id,title,description,image_url,width,height,created_at,user_id,status,gallery_item_tags(gallery_tags(id,name)),gallery_favorites(count)')
    .eq('status', 'PUBLISHED')
    .order('created_at', { ascending: false });
}

export async function fetchMyGalleryFavoriteItemIds(userId: string, galleryItemIds: string[]) {
  const supabase = getClient();
  const itemIds = Array.from(new Set(galleryItemIds)).filter(Boolean);
  if (!userId || !itemIds.length) return { data: [], error: null };

  return await supabase
    .from('gallery_favorites')
    .select('gallery_item_id')
    .eq('user_id', userId)
    .in('gallery_item_id', itemIds);
}

export async function addGalleryFavorite(userId: string, galleryItemId: string) {
  const supabase = getClient();
  return await supabase
    .from('gallery_favorites')
    .upsert({ user_id: userId, gallery_item_id: galleryItemId }, { onConflict: 'user_id,gallery_item_id', ignoreDuplicates: true });
}

export async function removeGalleryFavorite(userId: string, galleryItemId: string) {
  const supabase = getClient();
  return await supabase
    .from('gallery_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('gallery_item_id', galleryItemId);
}

export async function fetchMyGalleryItems(userId: string) {
  const supabase = getClient();
  return await supabase
    .from('gallery_items')
    .select('id,title,description,image_url,created_at,user_id,status,gallery_item_tags(gallery_tags(id,name)),gallery_item_moderation_requests(id,status,request_type,reason,created_at,decided_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function submitGalleryItem(params: {
  userId: string;
  role: AccountRole;
  file: File;
  title: string;
  description: string;
  tags: string[];
}) {
  const supabase = getClient();
  const fileError = validateGalleryFile(params.file);
  if (fileError) throw new Error(fileError);

  const { width, height } = await getImageDimensions(params.file);
  const filePath = `${params.userId}/${crypto.randomUUID()}.${getStorageExtension(params.file)}`;
  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(filePath, params.file, { contentType: params.file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(filePath);
  const imageUrl = publicUrlData.publicUrl;
  const isMaster = params.role === 'master';

  try {
    const { data: item, error: itemError } = await supabase
      .from('gallery_items')
      .insert({
        title: params.title.trim() || null,
        description: params.description.trim() || null,
        image_url: imageUrl,
        user_id: params.userId,
        status: isMaster ? 'PUBLISHED' : 'PENDING',
        width,
        height,
      })
      .select('id')
      .single();

    if (itemError) throw itemError;

    const tags = await ensureGalleryTags(supabase, params.tags);
    if (tags.length) {
      const { error: bindError } = await supabase
        .from('gallery_item_tags')
        .upsert(
          tags.map((tag) => ({ gallery_item_id: item.id, tag_id: tag.id })),
          { onConflict: 'gallery_item_id,tag_id', ignoreDuplicates: true },
        );

      if (bindError) throw bindError;
    }

    if (!isMaster) {
      const { error: requestError } = await supabase
        .from('gallery_item_moderation_requests')
        .insert({
          gallery_item_id: item.id,
          user_id: params.userId,
          reason: null,
          request_type: 'SUBMISSION',
        });

      if (requestError) throw requestError;
    }

    return { item, imageUrl, filePath };
  } catch (error) {
    await supabase.storage.from(GALLERY_BUCKET).remove([filePath]).catch(() => null);
    throw error;
  }
}

export async function requestGalleryItemRemoval(params: {
  userId: string;
  galleryItemId: string;
  reason: string;
}) {
  const supabase = getClient();

  const { error } = await supabase
    .from('gallery_item_moderation_requests')
    .insert({
      gallery_item_id: params.galleryItemId,
      user_id: params.userId,
      reason: params.reason.trim() || null,
      request_type: 'REMOVAL',
    });

  if (error) throw error;
}

export async function fetchPendingGalleryModerationRequests() {
  const supabase = getClient();
  return await supabase
    .from('gallery_item_moderation_requests')
    .select('id,gallery_item_id,user_id,reason,status,created_at,decided_at,request_type,gallery_items(id,title,description,image_url,created_at,user_id,status,gallery_item_tags(gallery_tags(id,name)))')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });
}

function getRelatedGalleryItemStatus(value: unknown): GalleryItemStatus | null {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== 'object' || !('status' in item)) return null;
  const status = (item as { status?: unknown }).status;
  return status === 'PENDING' || status === 'PUBLISHED' || status === 'HIDDEN' ? status : null;
}

export async function decideGalleryModerationRequest(params: {
  requestId: string;
  galleryItemId: string;
  requestType: GalleryItemModerationRequestType;
  decision: Exclude<GalleryItemModerationRequestStatus, 'PENDING' | 'CANCELED'>;
}) {
  const supabase = getClient();
  const decidedAt = new Date().toISOString();

  const { data: request, error: requestFetchError } = await supabase
    .from('gallery_item_moderation_requests')
    .select('id,gallery_item_id,request_type,status,gallery_items(id,status)')
    .eq('id', params.requestId)
    .single();

  if (requestFetchError) throw requestFetchError;
  if (!request || request.status !== 'PENDING') throw new Error('该审核请求已处理。');

  const galleryItemId = request.gallery_item_id || params.galleryItemId;
  const requestType = request.request_type;
  const currentStatus = getRelatedGalleryItemStatus(request.gallery_items);
  const nextStatus = params.decision === 'APPROVED'
    ? currentStatus === 'PENDING'
      ? 'PUBLISHED'
      : currentStatus === 'PUBLISHED' && requestType === 'REMOVAL'
        ? 'HIDDEN'
        : null
    : null;

  if (params.decision === 'APPROVED' && !nextStatus) throw new Error('该审核请求与稿件当前状态不匹配。');

  const { error: requestError } = await supabase
    .from('gallery_item_moderation_requests')
    .update({ status: params.decision, decided_at: decidedAt })
    .eq('id', params.requestId)
    .eq('status', 'PENDING');

  if (requestError) throw requestError;

  if (nextStatus) {
    const { data: updatedItem, error: itemError } = await supabase
      .from('gallery_items')
      .update({ status: nextStatus })
      .eq('id', galleryItemId)
      .select('status')
      .single();

    if (itemError) throw itemError;
    if (updatedItem?.status !== nextStatus) throw new Error('稿件状态更新结果与预期不一致。');
  }
}
