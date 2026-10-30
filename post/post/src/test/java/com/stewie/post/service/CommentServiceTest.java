package com.stewie.post.service;

import com.stewie.post.dto.request.CommentRequest;
import com.stewie.post.dto.response.CommentResponse;
import com.stewie.post.entity.*;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.CommentMapper;
import com.stewie.post.repository.CommentRepository;
import com.stewie.post.repository.LikeRepository;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.ProfileClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private LikeRepository likeRepository;

    @Mock
    private StatsUpdater statsUpdater;

    @Mock
    private LikeService likeService;

    @Mock
    private ProfileClient profileClient;

    @Mock
    private CommentMapper commentMapper;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private CommentService commentService;

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
    void createReplyToReplyFlattensToRootParent() {
        Post post = Post.builder().id("post-1").status(PostStatus.PUBLISHED).build();
        Comment replyParent = Comment.builder()
                .id("c-reply")
                .postId("post-1")
                .parentId("c-root")
                .build();

        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        when(commentRepository.findById("c-reply")).thenReturn(Optional.of(replyParent));
        when(commentMapper.toComment(any())).thenReturn(new Comment());
        when(commentRepository.save(any(Comment.class))).thenAnswer(i -> {
            Comment c = i.getArgument(0);
            c.setId("c-new");
            return c;
        });
        when(commentMapper.toCommentResponse(any())).thenReturn(CommentResponse.builder().id("c-new").build());

        CommentRequest req = CommentRequest.builder().parentId("c-reply").content("Hello").build();
        commentService.createComment(req, "post-1");

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(captor.capture());
        assertEquals("c-root", captor.getValue().getParentId());
        verify(statsUpdater).incComment("c-root", "replyCount", 1);
        verify(statsUpdater).incPost("post-1", "stats.commentCount", 1);
    }

    @Test
    void createCommentWithParentFromDifferentPostThrows() {
        Post post = Post.builder().id("post-1").status(PostStatus.PUBLISHED).build();
        Comment wrongParent = Comment.builder().id("c-other").postId("post-2").build();

        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));
        when(commentRepository.findById("c-other")).thenReturn(Optional.of(wrongParent));

        CommentRequest req = CommentRequest.builder().parentId("c-other").content("Hello").build();
        AppException ex = assertThrows(AppException.class, () -> commentService.createComment(req, "post-1"));
        assertEquals(ErrorCode.INVALID_PARENT_COMMENT, ex.getErrorCode());
    }

    @Test
    void deleteRootCommentCascadesRepliesAndUpdatesCount() {
        Comment root = Comment.builder()
                .id("c-root")
                .postId("post-1")
                .userId("user-123")
                .parentId(null)
                .build();
        Comment r1 = Comment.builder().id("r-1").parentId("c-root").postId("post-1").build();
        Comment r2 = Comment.builder().id("r-2").parentId("c-root").postId("post-1").build();

        when(commentRepository.findById("c-root")).thenReturn(Optional.of(root));
        when(commentRepository.findByParentId("c-root")).thenReturn(List.of(r1, r2));

        commentService.deleteComment("c-root");

        verify(commentRepository).deleteByParentId("c-root");
        verify(commentRepository).deleteById("c-root");
        verify(likeRepository).deleteByTargetTypeAndTargetIdIn(
                eq(LikeTargetType.COMMENT), argThat(ids -> ids.size() == 3));
        verify(statsUpdater).incPost("post-1", "stats.commentCount", -3);
    }

    @Test
    void postOwnerCanDeleteSomeoneElsesComment() {
        Comment comment = Comment.builder()
                .id("c-1")
                .postId("post-1")
                .userId("other-user")
                .parentId("c-root")
                .build();
        Post post = Post.builder().id("post-1").userId("user-123").build();

        when(commentRepository.findById("c-1")).thenReturn(Optional.of(comment));
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));

        commentService.deleteComment("c-1");

        verify(commentRepository).deleteById("c-1");
        verify(statsUpdater).incComment("c-root", "replyCount", -1);
        verify(statsUpdater).incPost("post-1", "stats.commentCount", -1);
    }

    @Test
    void strangerCannotDeleteComment() {
        Comment comment = Comment.builder()
                .id("c-1")
                .postId("post-1")
                .userId("other-user")
                .build();
        Post post = Post.builder().id("post-1").userId("post-owner").build();

        when(commentRepository.findById("c-1")).thenReturn(Optional.of(comment));
        when(postRepository.findById("post-1")).thenReturn(Optional.of(post));

        AppException ex = assertThrows(AppException.class, () -> commentService.deleteComment("c-1"));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }
}

