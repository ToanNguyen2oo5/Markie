import keycloak from '../keycloak';
import type {
  RelationshipStatus,
  FriendProfile,
  SocialApiResponse,
} from '../types/socialTypes';

const BASE_URL = '/profile/social';

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    await keycloak.updateToken(30);
  } catch {
    // Token update may fail if session is expired, proceed with existing or empty token
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (keycloak.token) {
    headers['Authorization'] = `Bearer ${keycloak.token}`;
  }

  return headers;
}

/**
 * Fetch relationship status between the authenticated user and target user
 */
export async function getRelationshipStatus(targetUserId: string): Promise<RelationshipStatus> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/relationship/${encodeURIComponent(targetUserId)}`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Không thể lấy trạng thái quan hệ (${res.status})`);
  }

  const data: SocialApiResponse<RelationshipStatus> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Lỗi khi tải trạng thái quan hệ');
  }

  return data.result;
}

/**
 * Send a friend request to target user
 */
export async function sendFriendRequest(toUserId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/friends/request/${encodeURIComponent(toUserId)}`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể gửi lời mời kết bạn');
  }

  const data: SocialApiResponse<void> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Gửi lời mời kết bạn thất bại');
  }
}

/**
 * Cancel a pending friend request sent to target user
 */
export async function cancelFriendRequest(toUserId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/friends/request/${encodeURIComponent(toUserId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể hủy lời mời kết bạn');
  }

  const data: SocialApiResponse<void> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Hủy lời mời thất bại');
  }
}

/**
 * Accept an incoming friend request from user
 */
export async function acceptFriendRequest(fromUserId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/friends/accept/${encodeURIComponent(fromUserId)}`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể chấp nhận lời mời');
  }

  const data: SocialApiResponse<void> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Chấp nhận lời mời thất bại');
  }
}

/**
 * Reject an incoming friend request from user
 */
export async function rejectFriendRequest(fromUserId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/friends/reject/${encodeURIComponent(fromUserId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể từ chối lời mời');
  }

  const data: SocialApiResponse<void> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Từ chối lời mời thất bại');
  }
}

/**
 * Unfriend a user
 */
export async function unfriend(otherUserId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}/friends/${encodeURIComponent(otherUserId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Không thể hủy kết bạn');
  }

  const data: SocialApiResponse<void> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Hủy kết bạn thất bại');
  }
}

/**
 * Retrieve paginated friends list for a user
 */
export async function getFriends(userId: string, page = 0, size = 20): Promise<FriendProfile[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/friends/${encodeURIComponent(userId)}?page=${page}&size=${size}`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Không thể lấy danh sách bạn bè (${res.status})`);
  }

  const data: SocialApiResponse<FriendProfile[]> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Lỗi khi tải danh sách bạn bè');
  }

  return data.result || [];
}

/**
 * Retrieve all registered users for friend suggestions/recommendations
 */
export async function getAllUsers(): Promise<FriendProfile[]> {
  const headers = await getAuthHeaders();
  const res = await fetch('/profile/users', { headers });

  if (!res.ok) {
    throw new Error(`Không thể lấy danh sách người dùng (${res.status})`);
  }

  const data: SocialApiResponse<FriendProfile[]> = await res.json();
  if (data.code !== 1000) {
    throw new Error(data.message || 'Lỗi khi tải danh sách người dùng');
  }

  return data.result || [];
}

