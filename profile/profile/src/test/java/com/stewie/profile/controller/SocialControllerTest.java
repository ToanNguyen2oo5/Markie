package com.stewie.profile.controller;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.stewie.profile.dto.response.ProfileResponse;
import com.stewie.profile.dto.response.RelationshipStatus;
import com.stewie.profile.exception.AppException;
import com.stewie.profile.exception.ErrorCode;
import com.stewie.profile.exception.GlobalExceptionHandler;
import com.stewie.profile.service.SocialService;

@ExtendWith(MockitoExtension.class)
class SocialControllerTest {

    private MockMvc mockMvc;

    @Mock
    private SocialService socialService;

    @InjectMocks
    private SocialController socialController;

    private static final String TARGET_USER_ID = "target-user-123";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(socialController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ── 1. FOLLOW & UNFOLLOW TESTS ──────────────────────────────────────────────

    @Nested
    @DisplayName("Follow & Unfollow APIs")
    class FollowTests {

        @Test
        @DisplayName("POST /social/follow/{toUserId} - Success")
        void followUser_success() throws Exception {
            doNothing().when(socialService).followUser(TARGET_USER_ID);

            mockMvc.perform(post("/social/follow/{toUserId}", TARGET_USER_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Followed successfully"));

            verify(socialService).followUser(TARGET_USER_ID);
        }

        @Test
        @DisplayName("POST /social/follow/{toUserId} - User Not Found")
        void followUser_userNotFound() throws Exception {
            doThrow(new AppException(ErrorCode.USER_NOT_EXISTED))
                    .when(socialService)
                    .followUser(TARGET_USER_ID);

            mockMvc.perform(post("/social/follow/{toUserId}", TARGET_USER_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value(ErrorCode.USER_NOT_EXISTED.getCode()))
                    .andExpect(jsonPath("$.message").value(ErrorCode.USER_NOT_EXISTED.getMessage()));

            verify(socialService).followUser(TARGET_USER_ID);
        }

        @Test
        @DisplayName("DELETE /social/follow/{toUserId} - Success")
        void unfollowUser_success() throws Exception {
            doNothing().when(socialService).unfollowUser(TARGET_USER_ID);

            mockMvc.perform(delete("/social/follow/{toUserId}", TARGET_USER_ID).contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Unfollowed successfully"));

            verify(socialService).unfollowUser(TARGET_USER_ID);
        }
    }

    // ── 2. FRIEND REQUEST TESTS ─────────────────────────────────────────────────

    @Nested
    @DisplayName("Friend Request APIs")
    class FriendRequestTests {

        @Test
        @DisplayName("POST /social/friends/request/{toUserId} - Send Friend Request Success")
        void sendFriendRequest_success() throws Exception {
            doNothing().when(socialService).sendFriendRequest(TARGET_USER_ID);

            mockMvc.perform(post("/social/friends/request/{toUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Friend request sent"));

            verify(socialService).sendFriendRequest(TARGET_USER_ID);
        }

        @Test
        @DisplayName("DELETE /social/friends/request/{toUserId} - Cancel Friend Request Success")
        void cancelFriendRequest_success() throws Exception {
            doNothing().when(socialService).cancelFriendRequest(TARGET_USER_ID);

            mockMvc.perform(delete("/social/friends/request/{toUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Friend request cancelled"));

            verify(socialService).cancelFriendRequest(TARGET_USER_ID);
        }

        @Test
        @DisplayName("POST /social/friends/accept/{fromUserId} - Accept Friend Request Success")
        void acceptFriendRequest_success() throws Exception {
            doNothing().when(socialService).acceptFriendRequest(TARGET_USER_ID);

            mockMvc.perform(post("/social/friends/accept/{fromUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Friend request accepted"));

            verify(socialService).acceptFriendRequest(TARGET_USER_ID);
        }

        @Test
        @DisplayName("DELETE /social/friends/reject/{fromUserId} - Reject Friend Request Success")
        void rejectFriendRequest_success() throws Exception {
            doNothing().when(socialService).rejectFriendRequest(TARGET_USER_ID);

            mockMvc.perform(delete("/social/friends/reject/{fromUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Friend request rejected"));

            verify(socialService).rejectFriendRequest(TARGET_USER_ID);
        }
    }

    // ── 3. UNFRIEND TESTS ────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Unfriend API")
    class UnfriendTests {

        @Test
        @DisplayName("DELETE /social/friends/{otherUserId} - Unfriend Success")
        void unfriend_success() throws Exception {
            doNothing().when(socialService).unfriend(TARGET_USER_ID);

            mockMvc.perform(delete("/social/friends/{otherUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.message").value("Unfriended successfully"));

            verify(socialService).unfriend(TARGET_USER_ID);
        }
    }

    // ── 4. QUERIES TESTS ─────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Social Queries APIs")
    class QueryTests {

        @Test
        @DisplayName("GET /social/friends/{userId} - Default Pagination (page=0, size=20)")
        void getFriends_defaultPagination() throws Exception {
            ProfileResponse friend = ProfileResponse.builder()
                    .userId("friend-1")
                    .username("frienduser")
                    .firstName("Friend")
                    .lastName("One")
                    .avatar("https://avatar.url/1.png")
                    .build();

            when(socialService.getFriends("user-1", 0, 20)).thenReturn(List.of(friend));

            mockMvc.perform(get("/social/friends/{userId}", "user-1").contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.result[0].userId").value("friend-1"))
                    .andExpect(jsonPath("$.result[0].username").value("frienduser"))
                    .andExpect(jsonPath("$.result[0].firstName").value("Friend"))
                    .andExpect(jsonPath("$.result[0].lastName").value("One"))
                    .andExpect(jsonPath("$.result[0].avatar").value("https://avatar.url/1.png"));

            verify(socialService).getFriends("user-1", 0, 20);
        }

        @Test
        @DisplayName("GET /social/friends/{userId}?page=2&size=5 - Custom Pagination")
        void getFriends_customPagination() throws Exception {
            when(socialService.getFriends("user-1", 2, 5)).thenReturn(List.of());

            mockMvc.perform(get("/social/friends/{userId}", "user-1")
                            .param("page", "2")
                            .param("size", "5")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.result").isArray())
                    .andExpect(jsonPath("$.result").isEmpty());

            verify(socialService).getFriends("user-1", 2, 5);
        }

        @Test
        @DisplayName("GET /social/relationship/{targetUserId} - Check Relationship Status")
        void getRelationshipStatus_success() throws Exception {
            RelationshipStatus statusObj = new RelationshipStatus(true, false, false, true);

            when(socialService.getRelationshipStatus(TARGET_USER_ID)).thenReturn(statusObj);

            mockMvc.perform(get("/social/relationship/{targetUserId}", TARGET_USER_ID)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(1000))
                    .andExpect(jsonPath("$.result.isFriend").value(true))
                    .andExpect(jsonPath("$.result.hasSentRequest").value(false))
                    .andExpect(jsonPath("$.result.hasReceivedRequest").value(false))
                    .andExpect(jsonPath("$.result.isFollowing").value(true))
                    .andExpect(jsonPath("$.result.friendshipState").value("FRIENDS"));

            verify(socialService).getRelationshipStatus(TARGET_USER_ID);
        }
    }
}
