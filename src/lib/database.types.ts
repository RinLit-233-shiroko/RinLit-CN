export type GalleryItemStatus = 'PUBLISHED' | 'HIDDEN' | 'PENDING';
export type AccountRole = 'USER' | 'MASTER' | 'CW_MAINTAINER';
export type GalleryItemModerationRequestType = 'SUBMISSION' | 'REMOVAL';
export type GalleryItemModerationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  created_at: string | null;
  user_id: string;
  status: GalleryItemStatus;
  width: number | null;
  height: number | null;
}

export interface Writing {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
  cover_url: string | null;
  language: string;
  created_at: string | null;
  updated_at: string | null;
  status: GalleryItemStatus;
}

export interface Profile {
  id: string;
  created_at: string;
  display_name: string | null;
}

export interface GalleryTag {
  id: string;
  name: string;
  created_at: string;
}

export interface GalleryItemTag {
  gallery_item_id: string;
  tag_id: string;
  created_at: string;
}

export interface GalleryItemModerationRequest {
  id: string;
  gallery_item_id: string;
  user_id: string;
  reason: string | null;
  status: GalleryItemModerationRequestStatus;
  created_at: string;
  decided_at: string | null;
  request_type: GalleryItemModerationRequestType;
}

export interface GalleryFavorite {
  user_id: string;
  gallery_item_id: string;
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role: AccountRole;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      gallery_items: {
        Row: GalleryItem;
        Insert: Omit<GalleryItem, 'id' | 'created_at' | 'user_id' | 'status'> & Partial<Pick<GalleryItem, 'id' | 'created_at' | 'user_id' | 'status'>>;
        Update: Partial<GalleryItem>;
      };
      writings: {
        Row: Writing;
        Insert: Omit<Writing, 'id' | 'created_at' | 'updated_at' | 'status'> & Partial<Pick<Writing, 'id' | 'created_at' | 'updated_at' | 'status'>>;
        Update: Partial<Writing>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & Partial<Pick<Profile, 'created_at'>>;
        Update: Partial<Profile>;
      };
      gallery_tags: {
        Row: GalleryTag;
        Insert: Omit<GalleryTag, 'id' | 'created_at'> & Partial<Pick<GalleryTag, 'id' | 'created_at'>>;
        Update: Partial<GalleryTag>;
      };
      gallery_item_tags: {
        Row: GalleryItemTag;
        Insert: Omit<GalleryItemTag, 'created_at'> & Partial<Pick<GalleryItemTag, 'created_at'>>;
        Update: Partial<GalleryItemTag>;
      };
      gallery_item_moderation_requests: {
        Row: GalleryItemModerationRequest;
        Insert: Omit<GalleryItemModerationRequest, 'id' | 'created_at' | 'decided_at' | 'status'> & Partial<Pick<GalleryItemModerationRequest, 'id' | 'created_at' | 'decided_at' | 'status'>>;
        Update: Partial<GalleryItemModerationRequest>;
      };
      gallery_favorites: {
        Row: GalleryFavorite;
        Insert: Omit<GalleryFavorite, 'created_at'> & Partial<Pick<GalleryFavorite, 'created_at'>>;
        Update: Partial<GalleryFavorite>;
      };
      user_roles: {
        Row: UserRole;
        Insert: Omit<UserRole, 'created_at'> & Partial<Pick<UserRole, 'created_at'>>;
        Update: Partial<UserRole>;
      };
    };
    Enums: {
      gallery_item_status: GalleryItemStatus;
      account_role: AccountRole;
      gallery_item_moderation_request_type: GalleryItemModerationRequestType;
      gallery_item_moderation_status: GalleryItemModerationRequestStatus;
    };
  };
}
