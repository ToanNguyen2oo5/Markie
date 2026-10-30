package com.stewie.post.service;

import com.stewie.post.dto.ApiResponse;
import com.stewie.post.dto.request.PostRequest;
import com.stewie.post.dto.request.internal.ClaimAttachmentRequest;
import com.stewie.post.dto.response.PageResponse;
import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.dto.response.ProfileResponse;
import com.stewie.post.dto.response.internal.PostFileDto;
import com.stewie.post.entity.LikeTargetType;
import com.stewie.post.entity.Post;
import com.stewie.post.entity.PostFile;
import com.stewie.post.entity.PostStatus;
import com.stewie.post.exception.AppException;
import com.stewie.post.exception.ErrorCode;
import com.stewie.post.mapper.PostMapper;
import com.stewie.post.repository.PostRepository;
import com.stewie.post.repository.StatsUpdater;
import com.stewie.post.repository.httpclient.FileClient;
import com.stewie.post.repository.httpclient.ProfileClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.SliceImpl;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;

    @Mock
    private StatsUpdater statsUpdater;

    @Mock
    private LikeService likeService;

    @Mock
    private ProfileClient profileClient;

    @Mock
    private FileClient fileClient;

    @Mock
    private PostMapper postMapper;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private PostService postService;

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
    void testCreatePostTextOnlySuccess() {
        PostRequest request = PostRequest.builder()
                .content("Hello World")
                .build();

        Post savedPost = Post.builder()
                .id("post-1")
                .userId("user-123")
                .content("Hello World")
                .status(PostStatus.PUBLISHED)
                .files(new ArrayList<>())
                .build();

        when(postRepository.save(any(Post.class))).thenReturn(savedPost);
        when(postMapper.toPostResponse(any(Post.class))).thenReturn(PostResponse.builder()
                .id("post-1")
                .userId("user-123")
                .content("Hello World")
                .status("PUBLISHED")
                .files(new ArrayList<>())
                .build());

        PostResponse response = postService.createPost(request);

        assertNotNull(response);
        assertEquals("post-1", response.getId());
        verify(fileClient, never()).claimPostAttachments(any());
        verify(postRepository).save(any(Post.class));
    }

    @Test
    void testCreatePostEmptyContentAndNoFilesThrows() {
        PostRequest request = PostRequest.builder()
                .content("   ")
                .fileIds(List.of())
                .build();

        AppException ex = assertThrows(AppException.class, () -> postService.createPost(request));
        assertEquals(ErrorCode.INVALID_POST_CONTENT, ex.getErrorCode());
    }

    @Test
    void testCreatePostTooManyFilesThrows() {
        List<String> tooManyFiles = List.of("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11");
        PostRequest request = PostRequest.builder()
                .content("Test")
                .fileIds(tooManyFiles)
                .build();

        AppException ex = assertThrows(AppException.class, () -> postService.createPost(request));
        assertEquals(ErrorCode.TOO_MANY_FILES, ex.getErrorCode());
    }

    @Test
    void testCreatePostDuplicateFileIdsThrows() {
        List<String> duplicateFiles = List.of("file-1", "file-1");
        PostRequest request = PostRequest.builder()
                .content("Test")
                .fileIds(duplicateFiles)
                .build();

        AppException ex = assertThrows(AppException.class, () -> postService.createPost(request));
        assertEquals(ErrorCode.INVALID_KEY, ex.getErrorCode());
    }

    @Test
    void testCreatePostWithAttachmentsSuccess() {
        PostRequest request = PostRequest.builder()
                .content("Post with image")
                .fileIds(List.of("f-1"))
                .build();

        Post pendingPost = Post.builder()
                .id("post-att-1")
                .userId("user-123")
                .content("Post with image")
                .status(PostStatus.PENDING_ATTACHMENTS)
                .fileIds(List.of("f-1"))
                .build();

        Post publishedPost = Post.builder()
                .id("post-att-1")
                .userId("user-123")
                .content("Post with image")
                .status(PostStatus.PUBLISHED)
                .fileIds(List.of("f-1"))
                .files(List.of(PostFile.builder()
                        .fileId("f-1")
                        .url("http://localhost:8888/file/media/download/f-1")
                        .originalName("photo.jpg")
                        .contentType("image/jpeg")
                        .size(1024L)
                        .build()))
                .build();

        when(postRepository.save(any(Post.class)))
                .thenReturn(pendingPost)
                .thenReturn(publishedPost);

        PostFileDto claimedDto = PostFileDto.builder()
                .fileId("f-1")
                .url("http://localhost:8888/file/media/download/f-1")
                .originalName("photo.jpg")
                .contentType("image/jpeg")
                .size(1024L)
                .build();

        when(fileClient.claimPostAttachments(any(ClaimAttachmentRequest.class)))
                .thenReturn(ApiResponse.<List<PostFileDto>>builder().result(List.of(claimedDto)).build());

        when(postMapper.toPostResponse(any(Post.class))).thenReturn(PostResponse.builder()
                .id("post-att-1")
                .userId("user-123")
                .content("Post with image")
                .status("PUBLISHED")
                .files(List.of(PostFile.builder()
                        .fileId("f-1")
                        .url("http://localhost:8888/file/media/download/f-1")
                        .originalName("photo.jpg")
                        .contentType("image/jpeg")
                        .size(1024L)
                        .build()))
                .build());

        PostResponse response = postService.createPost(request);

        assertNotNull(response);
        assertEquals("post-att-1", response.getId());
        assertEquals(1, response.getFiles().size());
        verify(fileClient).claimPostAttachments(any());
        verify(fileClient).commitPostAttachments(any());
    }

    @Test
    void testCreatePostClaimFailureRollback() {
        PostRequest request = PostRequest.builder()
                .content("Post with invalid file")
                .fileIds(List.of("f-invalid"))
                .build();

        Post pendingPost = Post.builder()
                .id("post-fail-1")
                .userId("user-123")
                .status(PostStatus.PENDING_ATTACHMENTS)
                .build();

        when(postRepository.save(any(Post.class))).thenReturn(pendingPost);
        when(fileClient.claimPostAttachments(any())).thenThrow(new RuntimeException("Claim error"));

        AppException ex = assertThrows(AppException.class, () -> postService.createPost(request));
        assertEquals(ErrorCode.FILE_ATTACHMENT_FAILED, ex.getErrorCode());

        verify(fileClient).releasePostAttachments(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGetFollowingFeedCombinesSelfAndFollowingAndBatchEnriches() {
        when(profileClient.getFollowingIds("user-123"))
                .thenReturn(ApiResponse.<List<String>>builder().result(List.of("friend-1", "friend-2")).build());

        Post p1 = Post.builder().id("p-2").userId("friend-1").content("Friend post").build();
        Post p2 = Post.builder().id("p-1").userId("user-123").content("My post").build();

        when(postRepository.findPublishedByUserIdIn(any(), any()))
                .thenReturn(new SliceImpl<>(List.of(p1, p2)));

        when(postMapper.toPostResponse(p1)).thenReturn(PostResponse.builder().id("p-2").userId("friend-1").build());
        when(postMapper.toPostResponse(p2)).thenReturn(PostResponse.builder().id("p-1").userId("user-123").build());

        when(profileClient.getProfilesByUserIds(any())).thenReturn(ApiResponse.<List<ProfileResponse>>builder()
                .result(List.of(
                        ProfileResponse.builder().userId("friend-1").username("alice").avatar("av-1").build(),
                        ProfileResponse.builder().userId("user-123").username("me").avatar("av-me").build()
                ))
                .build());

        when(likeService.getLikedTargetIds(eq("user-123"), eq(LikeTargetType.POST), any()))
                .thenReturn(Set.of("p-2"));

        PageResponse<PostResponse> page = postService.getFeed("following", null, 5);

        ArgumentCaptor<Collection<String>> authorsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(postRepository).findPublishedByUserIdIn(authorsCaptor.capture(), any());
        assertTrue(authorsCaptor.getValue().containsAll(List.of("user-123", "friend-1", "friend-2")));

        verify(profileClient, times(1)).getProfilesByUserIds(any());
        assertEquals(2, page.getData().size());
        assertEquals("alice", page.getData().get(0).getUsername());
        assertEquals("av-1", page.getData().get(0).getAvatar());
        assertTrue(page.getData().get(0).isLikedByMe());
        assertFalse(page.getData().get(1).isLikedByMe());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testGetFollowingFeedFallsBackToSelfWhenProfileServiceFails() {
        when(profileClient.getFollowingIds("user-123")).thenThrow(new RuntimeException("profile service down"));
        when(postRepository.findPublishedByUserIdIn(any(), any()))
                .thenReturn(new SliceImpl<>(List.of()));

        PageResponse<PostResponse> page = postService.getFeed("following", null, 5);

        ArgumentCaptor<Collection<String>> authorsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(postRepository).findPublishedByUserIdIn(authorsCaptor.capture(), any());
        assertEquals(Set.of("user-123"), Set.copyOf(authorsCaptor.getValue()));
        assertTrue(page.getData().isEmpty());
    }

    @Test
    void testGetDiscoverFeedQueriesExcludingCurrentUser() {
        Post p1 = Post.builder().id("p-9").userId("stranger-1").content("Hello").build();
        when(postRepository.findPublishedDiscover(eq("user-123"), any()))
                .thenReturn(new SliceImpl<>(List.of(p1)));
        when(postMapper.toPostResponse(p1)).thenReturn(PostResponse.builder().id("p-9").userId("stranger-1").build());

        PageResponse<PostResponse> page = postService.getFeed("discover", null, 5);

        verify(postRepository).findPublishedDiscover(eq("user-123"), any());
        assertEquals(1, page.getData().size());
    }
}
