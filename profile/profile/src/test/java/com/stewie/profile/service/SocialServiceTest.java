package com.stewie.profile.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.dto.response.RelationshipStatus;
import com.stewie.profile.entity.UserProfile;
import com.stewie.profile.exception.AppException;
import com.stewie.profile.exception.ErrorCode;
import com.stewie.profile.mapper.UserProfileMapper;
import com.stewie.profile.repository.UserProfileRepository;

@ExtendWith(MockitoExtension.class)
class SocialServiceTest {

    @Mock
    private UserProfileRepository userProfileRepository;

    @Mock
    private UserProfileMapper userProfileMapper;

    @InjectMocks
    private SocialService socialService;

    private static final String CURRENT_USER_ID = "current-user-001";
    private static final String TARGET_USER_ID = "target-user-002";

    private UserProfile targetProfile;

    @BeforeEach
    void setUp() {
        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        Authentication authentication = new UsernamePasswordAuthenticationToken(CURRENT_USER_ID, null, List.of());
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);

        targetProfile = UserProfile.builder()
                .userId(TARGET_USER_ID)
                .username("targetuser")
                .email("target@markie.com")
                .firstName("Target")
                .lastName("User")
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ── 1. FOLLOW / UNFOLLOW ────────────────────────────────────────────────────

    @Nested
    @DisplayName("Follow & Unfollow Operations")
    class FollowOperations {

        @Test
        @DisplayName("followUser - Success when target exists")
        void followUser_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.followUser(TARGET_USER_ID);

            verify(userProfileRepository).findByUserId(TARGET_USER_ID);
            verify(userProfileRepository).followUser(CURRENT_USER_ID, TARGET_USER_ID);
        }

        @Test
        @DisplayName("followUser - Throws AppException when target not found")
        void followUser_targetNotFound() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> socialService.followUser(TARGET_USER_ID))
                    .isInstanceOf(AppException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_EXISTED);
        }

        @Test
        @DisplayName("unfollowUser - Success when target exists")
        void unfollowUser_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.unfollowUser(TARGET_USER_ID);

            verify(userProfileRepository).findByUserId(TARGET_USER_ID);
            verify(userProfileRepository).unfollowUser(CURRENT_USER_ID, TARGET_USER_ID);
        }

        @Test
        @DisplayName("unfollowUser - Throws AppException when target not found")
        void unfollowUser_targetNotFound() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> socialService.unfollowUser(TARGET_USER_ID))
                    .isInstanceOf(AppException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_EXISTED);
        }
    }

    // ── 2. FRIEND REQUESTS ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("Friend Request Operations")
    class FriendRequestOperations {

        @Test
        @DisplayName("sendFriendRequest - Success")
        void sendFriendRequest_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.sendFriendRequest(TARGET_USER_ID);

            verify(userProfileRepository).sendFriendRequest(CURRENT_USER_ID, TARGET_USER_ID);
        }

        @Test
        @DisplayName("cancelFriendRequest - Current user cancels own sent request")
        void cancelFriendRequest_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.cancelFriendRequest(TARGET_USER_ID);

            verify(userProfileRepository).cancelOrRejectFriendRequest(CURRENT_USER_ID, TARGET_USER_ID);
        }

        @Test
        @DisplayName("rejectFriendRequest - Current user rejects received request")
        void rejectFriendRequest_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.rejectFriendRequest(TARGET_USER_ID);

            verify(userProfileRepository).cancelOrRejectFriendRequest(TARGET_USER_ID, CURRENT_USER_ID);
        }

        @Test
        @DisplayName("acceptFriendRequest - Current user accepts received request")
        void acceptFriendRequest_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.acceptFriendRequest(TARGET_USER_ID);

            verify(userProfileRepository).acceptFriendRequest(TARGET_USER_ID, CURRENT_USER_ID);
        }
    }

    // ── 3. UNFRIEND ─────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Unfriend Operation")
    class UnfriendOperations {

        @Test
        @DisplayName("unfriend - Success")
        void unfriend_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            socialService.unfriend(TARGET_USER_ID);

            verify(userProfileRepository).unfriend(CURRENT_USER_ID, TARGET_USER_ID);
        }
    }

    // ── 4. QUERIES ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Social Queries")
    class QueryOperations {

        @Test
        @DisplayName("getFriends - Correctly calculates skip from page and size")
        void getFriends_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            UserProfile friendEntity = UserProfile.builder()
                    .userId("friend-id-99")
                    .username("friend_test")
                    .build();

            ProfileResponse expectedResponse = ProfileResponse.builder()
                    .userId("friend-id-99")
                    .username("friend_test")
                    .build();

            int page = 2;
            int size = 10;
            int expectedSkip = 20;

            when(userProfileRepository.findFriends(TARGET_USER_ID, expectedSkip, size))
                    .thenReturn(List.of(friendEntity));
            when(userProfileMapper.toProfileResponse(friendEntity)).thenReturn(expectedResponse);

            List<ProfileResponse> result = socialService.getFriends(TARGET_USER_ID, page, size);

            assertThat(result).hasSize(1);
            assertThat(result.getFirst().getUserId()).isEqualTo("friend-id-99");
            verify(userProfileRepository).findFriends(TARGET_USER_ID, expectedSkip, size);
        }

        @Test
        @DisplayName("getRelationshipStatus - Returns full status")
        void getRelationshipStatus_success() {
            when(userProfileRepository.findByUserId(TARGET_USER_ID)).thenReturn(Optional.of(targetProfile));

            RelationshipStatus expectedStatus = new RelationshipStatus(true, false, false, true);
            when(userProfileRepository.getRelationshipStatus(CURRENT_USER_ID, TARGET_USER_ID))
                    .thenReturn(expectedStatus);

            RelationshipStatus result = socialService.getRelationshipStatus(TARGET_USER_ID);

            assertThat(result).isNotNull();
            assertThat(result.isFriend()).isTrue();
            assertThat(result.isFollowing()).isTrue();
            verify(userProfileRepository).getRelationshipStatus(CURRENT_USER_ID, TARGET_USER_ID);
        }
    }
}
