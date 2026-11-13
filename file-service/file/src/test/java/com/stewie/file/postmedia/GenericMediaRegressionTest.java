package com.stewie.file.postmedia;

import com.stewie.file.entity.FileMgmt;
import com.stewie.file.mapper.FileMgmtMapper;
import com.stewie.file.repository.*;
import com.stewie.file.service.*;
import com.stewie.file.exception.AppException;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.nio.file.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GenericMediaRegressionTest {
    @TempDir Path temp;
    FileRepository disk;
    FileMgmtRepository repo;
    FileService service;
    Map<String,FileMgmt> records;
    @BeforeEach void setup() throws Exception {
        disk=new FileRepository();Files.createDirectory(temp.resolve("generic"));
        ReflectionTestUtils.setField(disk,"storageDir",temp.resolve("generic").toString());
        ReflectionTestUtils.setField(disk,"urlPrefix","http://localhost:8888/file/media/download/");
        repo=mock(FileMgmtRepository.class);records=new HashMap<>();
        when(repo.save(any())).thenAnswer(i -> { FileMgmt m=i.getArgument(0);records.put(m.getId(),m);return m; });
        when(repo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(records.get(i.getArgument(0))));
        service=new FileService(disk,repo,org.mapstruct.factory.Mappers.getMapper(FileMgmtMapper.class));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("alice","unused",List.of()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }
    @Test void genericUploadDownloadAndSagaCompensationUseOnlyOldCollection() throws Exception {
        byte[] bytes={1,2,3};
        var response=service.uploadFile(new MockMultipartFile("file","old.png","image/png",bytes));
        assertThat(response.getOwnerId()).isEqualTo("alice");
        assertThat(response.getUrl()).endsWith(response.getOriginalName());
        assertThat(service.downloadFile(response.getOriginalName()).resource().getContentAsByteArray()).isEqualTo(bytes);
        var saga=service.uploadFileFromSaga(bytes,"avatar.jpg","image/jpeg","bob");
        assertThat(saga.getOwnerId()).isEqualTo("bob");
        assertThat(records.get(saga.getOriginalName()).getContentType()).isEqualTo("image/jpeg");
        service.deleteFileBySaga(saga.getOriginalName());
        assertThat(Files.exists(temp.resolve("generic").resolve(saga.getOriginalName()))).isFalse();
        assertThat(Files.exists(temp.resolve("generic").resolve(response.getOriginalName()))).isTrue();
    }
    @Test void genericLookupCannotFindPostMediaIdAndSagaCannotDeleteIt() throws Exception {
        var settings=new PostMediaSettings("fake",temp.resolve("post").toString(),temp.resolve("generic").toString(),"http://localhost:8888/file/post-media");
        var postDisk=new PostMediaStorage(settings);String id=postDisk.create(new byte[]{7,8,9});
        assertThatThrownBy(() -> service.downloadFile(id)).isInstanceOf(AppException.class);
        service.deleteFileBySaga(id);
        assertThat(postDisk.read(id)).isEqualTo(new byte[]{7,8,9});
    }
    @Test void genericReadAndDeleteRejectPathsIntoPostNamespaceEvenWithForgedMetadata() throws Exception {
        Files.createDirectory(temp.resolve("post"));Path post=temp.resolve("post/image");Files.write(post,new byte[]{7});
        FileMgmt forged=FileMgmt.builder().id("../post/image").path(post.toString()).build();
        records.put(forged.getId(),forged);
        assertThatThrownBy(() -> service.downloadFile(forged.getId())).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(() -> disk.deleteFile(forged.getId())).isInstanceOf(java.io.IOException.class);
        assertThat(Files.readAllBytes(post)).isEqualTo(new byte[]{7});
    }
    @Test void avatarConsumerStillDelegatesToGenericService() {
        var generic=mock(FileService.class);
        var redis=mock(org.springframework.data.redis.core.StringRedisTemplate.class);
        var kafka=mock(org.springframework.kafka.core.KafkaTemplate.class);
        var consumer=new AvatarSagaConsumer(redis,kafka,generic);
        var event=com.stewie.event.dto.AvatarUpdateFailedEvent.builder().sagaId("fake-saga").userId("alice").storedFileName("old-avatar.jpg").build();
        consumer.onAvatarProfileUpdateFailed(event);
        verify(generic).deleteFileBySaga("old-avatar.jpg");
        verify(kafka).send(eq("avatar.file.deleted"),eq("fake-saga"),any());
    }
    @Test void missingFileSecretFailsBeanCreation() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withUserConfiguration(PostMediaSettings.class)
                .withPropertyValues("app.post-media.internal-secret=", "app.post-media.storage-dir="+temp.resolve("post"),
                        "app.file.storage-dir="+temp.resolve("generic"),"app.post-media.public-base-url=http://localhost:8888/file/post-media")
                .run(context -> assertThat(context).hasFailed());
    }
}
