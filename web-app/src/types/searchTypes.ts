import type { PostFile } from './postTypes';

export interface SearchPostResult {
  id: string;
  userId: string;
  username: string | null;
  avatar?: string | null;
  files?: PostFile[];
  content: string;
  createdDate: string;
  likeCount: number | null;
  commentCount: number | null;
}

export interface SearchUserResult {
  userId: string;
  profileId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
}

export interface SearchPageResponse<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface SearchApiResponse<T> {
  code: number;
  message?: string;
  result: SearchPageResponse<T>;
}

export type SearchFilter = 'all' | 'posts' | 'users';
