package com.stewie.profile.controller;

import java.util.List;

import org.springframework.web.bind.annotation.*;

import com.stewie.profile.dto.ApiResponse;
import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.dto.response.RelationshipStatus;
import com.stewie.profile.service.SocialService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@RestController
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@RequestMapping("/social")
public class SocialController {

    SocialService socialService;

    // ── 1. FOLLOW / UNFOLLOW ────────────────────────────────────────────────────

    /** Theo doi mot user khac. */
    @PostMapping("/follow/{toUserId}")
    ApiResponse<Void> followUser(@PathVariable String toUserId) {
        socialService.followUser(toUserId);
        return ApiResponse.<Void>builder()
                .message("Followed successfully")
                .build();
    }

    /** Bo theo doi mot user khac. */
    @DeleteMapping("/follow/{toUserId}")
    ApiResponse<Void> unfollowUser(@PathVariable String toUserId) {
        socialService.unfollowUser(toUserId);
        return ApiResponse.<Void>builder()
                .message("Unfollowed successfully")
                .build();
    }

    // ── 2. FRIEND REQUEST ───────────────────────────────────────────────────────

    /** Gui loi moi ket ban den mot user. */
    @PostMapping("/friends/request/{toUserId}")
    ApiResponse<Void> sendFriendRequest(@PathVariable String toUserId) {
        socialService.sendFriendRequest(toUserId);
        return ApiResponse.<Void>builder()
                .message("Friend request sent")
                .build();
    }

    /** Huy loi moi ket ban da gui (nguoi gui thuc hien). */
    @DeleteMapping("/friends/request/{toUserId}")
    ApiResponse<Void> cancelFriendRequest(@PathVariable String toUserId) {
        socialService.cancelFriendRequest(toUserId);
        return ApiResponse.<Void>builder()
                .message("Friend request cancelled")
                .build();
    }

    /**
     * Chap nhan loi moi ket ban (nguoi nhan thuc hien).
     * fromUserId: userId cua nguoi da gui loi moi.
     */
    @PostMapping("/friends/accept/{fromUserId}")
    ApiResponse<Void> acceptFriendRequest(@PathVariable String fromUserId) {
        socialService.acceptFriendRequest(fromUserId);
        return ApiResponse.<Void>builder()
                .message("Friend request accepted")
                .build();
    }

    /**
     * Tu choi loi moi ket ban (nguoi nhan thuc hien).
     * fromUserId: userId cua nguoi da gui loi moi.
     */
    @DeleteMapping("/friends/reject/{fromUserId}")
    ApiResponse<Void> rejectFriendRequest(@PathVariable String fromUserId) {
        socialService.rejectFriendRequest(fromUserId);
        return ApiResponse.<Void>builder()
                .message("Friend request rejected")
                .build();
    }

    // ── 3. UNFRIEND ──────────────────────────────────────────────────────────────

    /** Huy ket ban voi mot user. */
    @DeleteMapping("/friends/{otherUserId}")
    ApiResponse<Void> unfriend(@PathVariable String otherUserId) {
        socialService.unfriend(otherUserId);
        return ApiResponse.<Void>builder()
                .message("Unfriended successfully")
                .build();
    }

    // ── 4. QUERIES ───────────────────────────────────────────────────────────────

    /**
     * Lay danh sach ban be cua mot user.
     * page bat dau tu 0, mac dinh size = 20.
     */
    @GetMapping("/friends/{userId}")
    ApiResponse<List<ProfileResponse>> getFriends(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<List<ProfileResponse>>builder()
                .result(socialService.getFriends(userId, page, size))
                .build();
    }

    /**
     * Kiem tra trang thai quan he giua current user va target user.
     * Tra ve: isFriend, hasSentRequest, hasReceivedRequest, isFollowing, friendshipState.
     */
    @GetMapping("/relationship/{targetUserId}")
    ApiResponse<RelationshipStatus> getRelationshipStatus(@PathVariable String targetUserId) {
        return ApiResponse.<RelationshipStatus>builder()
                .result(socialService.getRelationshipStatus(targetUserId))
                .build();
    }
}
