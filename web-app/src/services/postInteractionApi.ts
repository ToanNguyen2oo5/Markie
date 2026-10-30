import keycloak from '../keycloak';
import type {
  CommentData,
  CursorPage,
  LikerData,
  LikeStatusResponse,
} from '../types/postTypes';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    await keycloak.updateToken(30);
  } catch {
    // Proceed with existing token if update fails
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (keycloak.token) {
    headers['Authorization'] = `Bearer ${keycloak.token}`;
  }

  return headers;
}

async function unwrap<T>(res: Response, fallbackMsg: string): Promise<T> {
  const data: ApiResponse<T> | null = await res.json().catch(() => null);
  if (!res.ok || !data || data.code !== 1000) {
    throw new Error(data?.message || fallbackMsg);
  }
  return data.result;
}

export async function likePost(postId: string): Promise<LikeStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/like/post/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers,
  });
  return unwrap<LikeStatusResponse>(res, 'Không thể thích bài viết');
}

export async function unlikePost(postId: string): Promise<LikeStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/like/post/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers,
  });
  return unwrap<LikeStatusResponse>(res, 'Không thể bỏ thích bài viết');
}

export async function getPostLikers(
  postId: string,
  cursor?: string | null,
  limit = 20
): Promise<CursorPage<LikerData>> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(
    `/post/like/post/${encodeURIComponent(postId)}/users?${params}`,
    { headers }
  );
  return unwrap<CursorPage<LikerData>>(res, 'Không thể tải danh sách lượt thích');
}

export async function likeComment(commentId: string): Promise<LikeStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/like/comment/${encodeURIComponent(commentId)}`, {
    method: 'POST',
    headers,
  });
  return unwrap<LikeStatusResponse>(res, 'Không thể thích bình luận');
}

export async function unlikeComment(commentId: string): Promise<LikeStatusResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/like/comment/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers,
  });
  return unwrap<LikeStatusResponse>(res, 'Không thể bỏ thích bình luận');
}

export async function sharePost(postId: string): Promise<{ shareCount: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/share/${encodeURIComponent(postId)}`, {
    method: 'POST',
    headers,
  });
  return unwrap<{ shareCount: number }>(res, 'Không thể ghi nhận chia sẻ');
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<CommentData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/comment/update/${encodeURIComponent(commentId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ content }),
  });
  return unwrap<CommentData>(res, 'Không thể cập nhật bình luận');
}

export async function deleteComment(commentId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/post/comment/delete/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    headers,
  });
  await unwrap<void>(res, 'Không thể xóa bình luận');
}

