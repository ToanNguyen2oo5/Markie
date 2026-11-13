package com.stewie.file.postmedia;

import com.stewie.file.exception.AppException;
import com.stewie.file.exception.ErrorCode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.*;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PostMediaServiceTest {
    @TempDir Path temp;
    PostMediaRepository repo;
    PostMediaStorage disk;
    PostMediaService service;
    PostMediaSettings settings;
    PostImageValidator.ValidatedImage image;
    Map<String,PostMedia> records;
    @BeforeEach void setup() throws Exception {
        repo = mock(PostMediaRepository.class);
        settings = new PostMediaSettings("fake-internal", temp.resolve("post").toString(), temp.resolve("generic").toString(), "http://localhost:8888/file/post-media");
        disk = new PostMediaStorage(settings);
        service = new PostMediaService(repo,disk,settings);
        image = new PostImageValidator().validate(List.of(new MockMultipartFile("image", "../../other.svg", "text/html", ImageFixtures.image("png"))));
        records = new HashMap<>();
        when(repo.insert(any(PostMedia.class))).thenAnswer(i -> { PostMedia m = i.getArgument(0); records.put(m.getId(),m); return m; });
        when(repo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(records.get(i.getArgument(0))));
    }
    @Test void createsReadsAndDeletesImmutableBytesWithOwnerTombstone() throws Exception {
        var result = service.create(image,"alice");
        assertThat(PostMediaStorage.validId(result.fileId())).isTrue();
        assertThat(result.url()).isEqualTo(settings.publicBase + "/" + result.fileId());
        assertThat(result.contentType()).isEqualTo("image/png");
        assertThat(result.size()).isEqualTo(image.size());
        assertThat(result.width()).isEqualTo(3); assertThat(result.height()).isEqualTo(2);
        assertThat(records.get(result.fileId()).getOwnerId()).isEqualTo("alice");
        assertThat(service.read(service.get(result.fileId()))).isEqualTo(image.bytes());
        service.delete(result.fileId(),"alice"); service.delete(result.fileId(),"alice");
        assertThat(Files.exists(settings.root.resolve(result.fileId()))).isFalse();
        verify(repo, times(1)).save(any());
        assertThatThrownBy(() -> service.get(result.fileId())).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.delete(result.fileId(),"bob")).isInstanceOfSatisfying(AppException.class,e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.POST_MEDIA_FORBIDDEN));
    }
    @Test void rejectsCrossOwnerWithoutTouchingBytes() {
        var result = service.create(image,"alice");
        assertThatThrownBy(() -> service.delete(result.fileId(),"bob")).isInstanceOf(AppException.class);
        assertThat(service.read(service.get(result.fileId()))).isEqualTo(image.bytes());
        verify(repo,never()).save(any());
    }
    @Test void missingIdDeleteIsIdempotent() { service.delete(UUID.randomUUID().toString(),"alice"); verify(repo,never()).save(any()); }
    @ParameterizedTest @ValueSource(strings={"../x", "..\\x", "post-media/x", "C:/x", "generic.png", "", "%2e%2e"})
    void rejectsInvalidIdsBeforeLookup(String id) {
        assertThatThrownBy(() -> service.get(id)).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> service.delete(id,"alice")).isInstanceOf(AppException.class);
        verify(repo,never()).findById(anyString());
    }
    @Test void definitiveMetadataFailureCleansOnlyNewFile() throws Exception {
        String previous = disk.create(image.bytes());
        when(repo.insert(any(PostMedia.class))).thenThrow(new DataIntegrityViolationException("synthetic rejected write"));
        assertThatThrownBy(() -> service.create(image,"alice")).isInstanceOf(AppException.class);
        try(var files = Files.list(settings.root)) { assertThat(files.map(p -> p.getFileName().toString()).toList()).containsExactly(previous); }
        assertThat(disk.read(previous)).isEqualTo(image.bytes());
    }
    @Test void uncertainMetadataFailureRetainsBytesEvenWhenReadAbsent() throws Exception {
        when(repo.insert(any(PostMedia.class))).thenThrow(new DataAccessResourceFailureException("synthetic network failure"));
        assertThatThrownBy(() -> service.create(image,"alice")).isInstanceOf(AppException.class);
        try(var files = Files.list(settings.root)) { assertThat(files.count()).isEqualTo(1); }
        verify(repo).findById(anyString());
    }
    @Test void uncertainCommittedMetadataRetainsBytes() throws Exception {
        when(repo.insert(any(PostMedia.class))).thenAnswer(i -> { PostMedia m=i.getArgument(0);records.put(m.getId(),m);throw new DataAccessResourceFailureException("synthetic timeout"); });
        assertThatThrownBy(() -> service.create(image,"alice")).isInstanceOf(AppException.class);
        PostMedia media = records.values().iterator().next();
        assertThat(service.read(service.get(media.getId()))).isEqualTo(image.bytes());
    }
    @Test void cleanupFailureIsSanitizedAndDoesNotHideStorageError() throws Exception {
        PostMediaStorage mockDisk = mock(PostMediaStorage.class);
        String id = UUID.randomUUID().toString();
        when(mockDisk.create(any())).thenReturn(id);
        doThrow(new java.io.IOException("private server path")).when(mockDisk).delete(id);
        when(repo.insert(any(PostMedia.class))).thenThrow(new DataIntegrityViolationException("fake secret"));
        assertThatThrownBy(() -> new PostMediaService(repo,mockDisk,settings).create(image,"alice"))
                .isInstanceOf(AppException.class).hasMessage("Post media unavailable").hasNoCause();
        verify(mockDisk).delete(id);
    }
    @Test void writeFailureNeverInsertsMetadata() throws Exception {
        PostMediaStorage mockDisk=mock(PostMediaStorage.class);
        when(mockDisk.create(any())).thenThrow(new java.io.IOException("fake path"));
        assertThatThrownBy(() -> new PostMediaService(repo,mockDisk,settings).create(image,"alice")).isInstanceOf(AppException.class).hasNoCause();
        verify(repo,never()).insert(any(PostMedia.class));
    }
    @Test void deletionFailureCanBeRetried() throws Exception {
        var result=service.create(image,"alice");
        when(repo.save(any())).thenThrow(new DataAccessResourceFailureException("fake failure"));
        assertThatThrownBy(() -> service.delete(result.fileId(),"alice")).isInstanceOf(AppException.class);
        // Simulate persisted metadata still active after failed save.
        records.get(result.fileId()).setDeleted(false);
        doAnswer(i -> i.getArgument(0)).when(repo).save(any());
        service.delete(result.fileId(),"alice");
        assertThat(records.get(result.fileId()).isDeleted()).isTrue();
    }
    @ParameterizedTest @ValueSource(strings={"", " ", "${UNSET}"})
    void secretMustBeConfigured(String secret) {
        assertThatThrownBy(() -> new PostMediaSettings(secret,temp.resolve("post").toString(),temp.resolve("generic").toString(),settings.publicBase)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rootsMustBeDisjoint() {
        assertThatThrownBy(() -> new PostMediaSettings("fake",temp.toString(),temp.toString(),settings.publicBase)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PostMediaSettings("fake",temp.resolve("post").toString(),temp.toString(),settings.publicBase)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void collisionNeverOverwritesOrDeletesExistingFile() throws Exception {
        String id=disk.create(new byte[]{9,8,7});
        var collision=new PostMediaStorage(settings) { @Override String nextId() { return id; } };
        assertThatThrownBy(() -> collision.create(new byte[]{1})).isInstanceOf(FileAlreadyExistsException.class);
        assertThat(disk.read(id)).isEqualTo(new byte[]{9,8,7});
    }
    @Test void diskRejectsTraversalAndLeavesOtherFilesUntouched() throws Exception {
        Path other=temp.resolve("other");Files.write(other,new byte[]{9});
        assertThatThrownBy(() -> disk.read("../other")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(() -> disk.delete("../other")).isInstanceOf(java.io.IOException.class);
        assertThat(Files.readAllBytes(other)).isEqualTo(new byte[]{9});
    }
}
