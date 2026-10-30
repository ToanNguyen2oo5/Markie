export type FeedTab = 'following' | 'discover';

export interface PostFile {
  fileId: string;
  url: string;
  originalName: string;
  contentType: string;
  size: number;
}

export interface PostStats {
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export interface PostData {
  id: string;
  userId: string;
  username: string | null;
  avatar?: string | null;
  content: string;
  status?: string;
  files?: PostFile[];
  stats?: PostStats;
  likedByMe?: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface CreatePostRequest {
  content?: string;
  fileIds?: string[];
  clientRequestId?: string;
}

export interface CreateStatusResponse {
  status: string;
  postId: string;
  result: PostData;
}

export interface CommentData {
  id: string;
  postId: string;
  userId: string;
  username: string | null;
  parentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  likedByMe: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LikeStatusResponse {
  liked: boolean;
  likeCount: number;
}

export interface LikerData {
  userId: string;
  username: string | null;
  avatar: string | null;
  likedAt: string;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
}
