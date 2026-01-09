// User & Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

// Article Types
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  author?: User;
  categoryId?: string;
  category?: Category;
  tags?: Tag[];
  status: ContentStatus;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type ContentStatus = 'draft' | 'published' | 'archived';

// Document Types
export interface Document {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  authorId: string;
  author?: User;
  categoryId?: string;
  category?: Category;
  tags?: Tag[];
  status: ContentStatus;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  downloadsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Category & Tag Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author?: User;
  contentType: ContentType;
  contentId: string;
  parentId?: string;
  parent?: Comment;
  replies?: Comment[];
  createdAt: Date;
  updatedAt: Date;
}

export type ContentType = 'article' | 'document';

// Reaction Types
export interface Reaction {
  id: string;
  type: ReactionType;
  userId: string;
  user?: User;
  contentType: ContentType;
  contentId: string;
  createdAt: Date;
}

export type ReactionType = 'like' | 'dislike';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Search Types
export interface SearchResult {
  id: string;
  type: ContentType;
  title: string;
  excerpt: string;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchParams {
  query: string;
  type?: ContentType;
  categoryId?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}
