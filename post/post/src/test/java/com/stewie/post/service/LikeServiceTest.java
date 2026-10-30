package com.stewie.post.service;

import com.stewie.post.dto.response.LikeStatusResponse;
import com.stewie.post.entity.*;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.repository.CommentRepository;
import com.stewie.post.repository.LikeRepository;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.ProfileClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LikeServiceTest {

    @Mock
    private LikeRepository likeRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private StatsUpdater statsUpdater;

    @Mock
    private ProfileClient profileClient;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private LikeService likeService;

    @BeforeEach
    void setUp() {
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        lenient().when(authentication.getName()).thenReturn("user-123");
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void likePostSuccessIncrementsCounter() {
        Post post = Post.builder()
                .id("post-1")
                .status(PostStatus.PUBLISHED)
                .stats(PostStats.builder().likeCount(2).build())
                .build();
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));

        LikeStatusResponse res = likeService.likePost("post-1");

        assertTrue(res.isLiked());
        assertEquals(3L, res.getLikeCount());
        verify(likeRepository).save(any(Like.class));
        verify(statsUpdater).incPost("post-1", "stats.likeCount", 1);
    }

    @Test
    void likePostIdempotentOnDuplicateKey() {
        Post post = Post.builder()
                .id("post-1")
                .status(PostStatus.PUBLISHED)
                .stats(PostStats.builder().likeCount(2).build())
                .build();
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        when(likeRepository.save(any(Like.class))).thenThrow(new DuplicateKeyException("dup"));

        LikeStatusResponse res = likeService.likePost("post-1");

        assertTrue(res.isLiked());
        assertEquals(2L, res.getLikeCount());
        verify(statsUpdater, never()).incPost(any(), any(), anyLong());
    }

    @Test
    void unlikePostWhenNotLikedDoesNotDecrement() {
        Post post = Post.builder()
                .id("post-1")
                .status(PostStatus.PUBLISHED)
                .stats(PostStats.builder().likeCount(2).build())
                .build();
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        when(likeRepository.deleteByTargetTypeAndTargetIdAndUserId(LikeTargetType.POST, "post-1", "user-123"))
                .thenReturn(0L);

        LikeStatusResponse res = likeService.unlikePost("post-1");

        assertFalse(res.isLiked());
        assertEquals(2L, res.getLikeCount());
        verify(statsUpdater, never()).incPost(any(), any(), anyLong());
    }

    @Test
    void likeUnpublishedPostThrows() {
        Post post = Post.builder()
                .id("post-1")
                .status(PostStatus.PENDING_ATTACHMENTS)
                .build();
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));

        AppException ex = assertThrows(AppException.class, () -> likeService.likePost("post-1"));
        assertEquals(ErrorCode.POST_NOT_EXISTED, ex.getErrorCode());
    }
}

