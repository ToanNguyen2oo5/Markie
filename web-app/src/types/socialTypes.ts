export type FriendshipState = 'NONE' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'FRIENDS';

export interface RelationshipStatus {
  isFriend: boolean;
  hasSentRequest: boolean;
  hasReceivedRequest: boolean;
  isFollowing?: boolean;
  friendshipState?: FriendshipState;
}

export interface FriendProfile {
  profileId: string;
  userId: string;
  avatar: string | null;
  email: string | null;
  username: string;
  firstName: string | null;
  lastName: string | null;
  dob?: string | null;
  address?: string | null;
}

export interface SocialApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

/**
 * Resolves a normalized FriendshipState from RelationshipStatus
 */
export function resolveFriendshipState(status?: Partial<RelationshipStatus> | null): FriendshipState {
  if (!status) return 'NONE';
  if (status.friendshipState) return status.friendshipState;
  if (status.isFriend) return 'FRIENDS';
  if (status.hasSentRequest) return 'REQUEST_SENT';
  if (status.hasReceivedRequest) return 'REQUEST_RECEIVED';
  return 'NONE';
}
