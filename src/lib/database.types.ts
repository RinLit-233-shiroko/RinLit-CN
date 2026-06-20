export type GalleryItemStatus = 'draft' | 'published' | 'archived';

export interface GalleryItem {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  language: string | null;
  tags: string[] | null;
  created_at: string | null;
  user_id: string;
  status: GalleryItemStatus;
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

export interface Account {
  id: string;
  role: string;
  created_at: string;
}

export interface GalleryItemDeletionRequest {
  id: string;
  gallery_item_id: string;
  user_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  decided_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      gallery_items: {
        Row: GalleryItem;
        Insert: Omit<GalleryItem, 'id' | 'created_at'> & Partial<Pick<GalleryItem, 'id' | 'created_at'>>;
        Update: Partial<GalleryItem>;
      };
      writings: {
        Row: Writing;
        Insert: Omit<Writing, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Writing, 'id' | 'created_at' | 'updated_at'>>;
        Update: Partial<Writing>;
      };
      accounts: {
        Row: Account;
        Insert: Omit<Account, 'created_at'> & Partial<Pick<Account, 'created_at'>>;
        Update: Partial<Account>;
      };
      gallery_item_deletion_requests: {
        Row: GalleryItemDeletionRequest;
        Insert: Omit<GalleryItemDeletionRequest, 'id' | 'created_at' | 'decided_at'> & Partial<Pick<GalleryItemDeletionRequest, 'id' | 'created_at' | 'decided_at'>>;
        Update: Partial<GalleryItemDeletionRequest>;
      };
    };
    Enums: {
      gallery_item_status: GalleryItemStatus;
    };
  };
}
