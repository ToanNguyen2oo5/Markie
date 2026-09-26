package com.stewie.profile.service;

import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.dto.response.RelationshipStatus;
import com.stewie.profile.exception.AppException;
import com.stewie.profile.exception.ErrorCode;
import com.stewie.profile.mapper.UserProfileMapper;
import com.stewie.profile.repository.UserProfileRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SocialService {

    UserProfileRepository userProfileRepository;
    UserProfileMapper userProfileMapper;

    // ── Helper ──────────────────────────────────────────────────────────────────

    private String currentUserId() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    private void ensureUserExists(String userId) {
        userProfileRepository.findByUserId(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    // ── 1. FOLLOW / UNFOLLOW ────────────────────────────────────────────────────

    public void followUser(String toUserId) {
        String fromUserId = currentUserId();
        ensureUserExists(toUserId);
        userProfileRepository.followUser(fromUserId, toUserId);
        log.info("User {} followed user {}", fromUserId, toUserId);
    }

    public void unfollowUser(String toUserId) {
        String fromUserId = currentUserId();
        ensureUserExists(toUserId);
        userProfileRepository.unfollowUser(fromUserId, toUserId);
        log.info("User {} unfollowed user {}", fromUserId, toUserId);
    }

    // ── 2. FRIEND REQUEST ───────────────────────────────────────────────────────

    public void sendFriendRequest(String toUserId) {
        String fromUserId = currentUserId();
        ensureUserExists(toUserId);
        userProfileRepository.sendFriendRequest(fromUserId, toUserId);
        log.info("User {} sent friend request to user {}", fromUserId, toUserId);
    }

    /** Nguoi gui huy loi moi ket ban ma minh da gui. */
    public void cancelFriendRequest(String toUserId) {
        String fromUserId = currentUserId();
        ensureUserExists(toUserId);
        userProfileRepository.cancelOrRejectFriendRequest(fromUserId, toUserId);
        log.info("User {} cancelled friend request to user {}", fromUserId, toUserId);
    }

    /** Nguoi nhan tu choi loi moi ket ban. fromUserId = nguoi da gui loi moi. */
    public void rejectFriendRequest(String fromUserId) {
        String toUserId = currentUserId();
        ensureUserExists(fromUserId);
        userProfileRepository.cancelOrRejectFriendRequest(fromUserId, toUserId);
        log.info("User {} rejected friend request from user {}", toUserId, fromUserId);
    }

    /** Nguoi nhan chap nhan loi moi ket ban. fromUserId = nguoi da gui loi moi. */
    public void acceptFriendRequest(String fromUserId) {
        String toUserId = currentUserId();
        ensureUserExists(fromUserId);
        userProfileRepository.acceptFriendRequest(fromUserId, toUserId);
        log.info("User {} accepted friend request from user {}", toUserId, fromUserId);
    }

    // ── 3. UNFRIEND ──────────────────────────────────────────────────────────────

    public void unfriend(String otherUserId) {
        String userId = currentUserId();
        ensureUserExists(otherUserId);
        userProfileRepository.unfriend(userId, otherUserId);
        log.info("User {} unfriended user {}", userId, otherUserId);
    }

    // ── 4. QUERIES ───────────────────────────────────────────────────────────────

    public List<ProfileResponse> getFriends(String userId, int page, int size) {
        ensureUserExists(userId);
        int skip = page * size;
        return userProfileRepository.findFriends(userId, skip, size).stream()
                .map(userProfileMapper::toProfileResponse)
                .toList();
    }

    public RelationshipStatus getRelationshipStatus(String targetUserId) {
        String meId = currentUserId();
        ensureUserExists(targetUserId);
        return userProfileRepository.getRelationshipStatus(meId, targetUserId);
    }
}
