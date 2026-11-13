package com.stewie.file.postmedia;

import com.stewie.file.configuration.SecurityConfig;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.http.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.autoconfigure.web.servlet.*;
import org.springframework.boot.autoconfigure.web.embedded.EmbeddedWebServerFactoryCustomizerAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.nio.file.*;
import java.net.*;
import java.net.http.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes=PostMediaHttpTest.TestApp.class, webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties={"server.address=127.0.0.1", "logging.level.root=WARN"})
@org.springframework.test.annotation.DirtiesContext(classMode=org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
class PostMediaHttpTest {
    static final Path TEMP;
    static { try { TEMP=Files.createTempDirectory("markie-i05-http-"); } catch(IOException e) { throw new ExceptionInInitializerError(e); } }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry p) {
        p.add("app.post-media.storage-dir", () -> TEMP.resolve("post").toString());
        p.add("app.file.storage-dir", () -> TEMP.resolve("generic").toString());
        p.add("app.post-media.internal-secret", () -> "fake-internal");
    }
    @AfterAll static void cleanup() throws Exception { org.springframework.util.FileSystemUtils.deleteRecursively(TEMP); }
    @Configuration(proxyBeanMethods=false) @TestComponent
    @ImportAutoConfiguration({ServletWebServerFactoryAutoConfiguration.class,DispatcherServletAutoConfiguration.class,
            WebMvcAutoConfiguration.class,HttpMessageConvertersAutoConfiguration.class,MultipartAutoConfiguration.class,
            EmbeddedWebServerFactoryCustomizerAutoConfiguration.class,SecurityFilterAutoConfiguration.class})
    @Import({SecurityConfig.class,PostMediaSettings.class,PostMediaStorage.class,PostMediaService.class,
            PostImageValidator.class,PostMediaController.class,PostMediaAdvice.class})
    static class TestApp {
        @Bean JwtDecoder decoder() {
            return token -> {
                if (!Set.of("alice","bob","no-sub").contains(token)) throw new BadJwtException("Synthetic invalid token");
                var builder = Jwt.withTokenValue(token).header("alg","test-only")
                        .issuedAt(java.time.Instant.now()).expiresAt(java.time.Instant.now().plusSeconds(60));
                if (!token.equals("no-sub")) builder.subject(token);
                return builder.build();
            };
        }
        @Bean PostMediaRepository repository() {
            var repo=mock(PostMediaRepository.class);
            Map<String,PostMedia> data=new ConcurrentHashMap<>();
            when(repo.insert(any(PostMedia.class))).thenAnswer(i -> { PostMedia m=i.getArgument(0);data.put(m.getId(),m);return m; });
            when(repo.findById(anyString())).thenAnswer(i -> Optional.ofNullable(data.get(i.getArgument(0))));
            when(repo.save(any(PostMedia.class))).thenAnswer(i -> { PostMedia m=i.getArgument(0);data.put(m.getId(),m);return m; });
            return repo;
        }
    }
    @LocalServerPort int port;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.context.ApplicationContext context;
    static byte[] part(String name,String filename,byte[] bytes) throws Exception {
        var out=new ByteArrayOutputStream();
        out.write(("--boundary\r\nContent-Disposition: form-data; name=\""+name+"\""+(filename==null?"":"; filename=\""+filename+"\"")+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(bytes);out.write("\r\n".getBytes(StandardCharsets.US_ASCII));return out.toByteArray();
    }
    static byte[] body(byte[]... parts) throws Exception {
        var out=new ByteArrayOutputStream();for(byte[] part:parts) out.write(part);
        out.write("--boundary--\r\n".getBytes(StandardCharsets.US_ASCII));return out.toByteArray();
    }
    HttpResponse<byte[]> send(String method,String path,String jwt,String secret,byte[] bytes) throws Exception {
        var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/file"+path));
        if(jwt!=null)request.header("Authorization","Bearer "+jwt);
        if(secret!=null)request.header(PostMediaSettings.HEADER,secret);
        if(bytes!=null)request.header("Content-Type","multipart/form-data; boundary=boundary");
        try(var client=HttpClient.newHttpClient()) {
            return client.send(request.method(method,bytes==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(bytes)).build(),HttpResponse.BodyHandlers.ofByteArray());
        }
    }
    String create() throws Exception {
        var response=send("POST","/internal/post-media","alice","fake-internal",body(part("image","untrusted.svg",ImageFixtures.image("png"))));
        assertThat(response.statusCode()).isEqualTo(200);
        var json=new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.body());
        assertThat(json.path("code").asInt()).isEqualTo(1000);
        assertThat(json.path("result").size()).isEqualTo(6);
        return json.path("result").path("fileId").asText();
    }
    @Test void createReadDeleteAndCrossOwnerContract() throws Exception {
        String id=create();
        var get=send("GET","/post-media/"+id,null,null,null);
        assertThat(get.statusCode()).isEqualTo(200);
        assertThat(get.body()).isEqualTo(ImageFixtures.image("png"));
        assertThat(get.headers().firstValue("Content-Type")).contains("image/png");
        assertThat(get.headers().firstValue("Content-Length")).contains(""+get.body().length);
        assertThat(get.headers().firstValue("X-Content-Type-Options")).contains("nosniff");
        assertThat(send("DELETE","/internal/post-media/"+id,"bob","fake-internal",null).statusCode()).isEqualTo(403);
        for(int i=0;i<2;i++) {
            var deleted=send("DELETE","/internal/post-media/"+id,"alice","fake-internal",null);
            assertThat(deleted.statusCode()).isEqualTo(204);assertThat(deleted.body()).isEmpty();
        }
        assertThat(send("GET","/post-media/"+id,null,null,null).statusCode()).isEqualTo(404);
        assertThat(send("DELETE","/internal/post-media/"+id,"bob","fake-internal",null).statusCode()).isEqualTo(403);
    }
    @ParameterizedTest @CsvSource(value={"NULL,fake-internal,401","invalid,fake-internal,401","no-sub,fake-internal,401","alice,NULL,403","alice,wrong,403"})
    void bothCredentialsAreRequiredForCreateAndDelete(String jwt,String secret,int status) throws Exception {
        jwt=jwt.equals("NULL")?null:jwt;secret=secret.equals("NULL")?null:secret;
        assertThat(send("POST","/internal/post-media",jwt,secret,body(part("image","a.png",ImageFixtures.image("png")))).statusCode()).isEqualTo(status);
        assertThat(send("DELETE","/internal/post-media/"+UUID.randomUUID(),jwt,secret,null).statusCode()).isEqualTo(status);
    }
    @Test void ownerPartAndMultipleOrTextImagesAreRejected() throws Exception {
        byte[] image=part("image","a.png",ImageFixtures.image("png"));
        assertThat(send("POST","/internal/post-media","alice","fake-internal",body(image,part("ownerId",null,"bob".getBytes()))).statusCode()).isEqualTo(400);
        assertThat(send("POST","/internal/post-media","alice","fake-internal",body(image,image)).statusCode()).isEqualTo(400);
        assertThat(send("POST","/internal/post-media","alice","fake-internal",body(part("image",null,"url".getBytes()))).statusCode()).isEqualTo(400);
    }
    @Test void corruptAndOversizedFilesAreRejected() throws Exception {
        assertThat(send("POST","/internal/post-media","alice","fake-internal",body(part("image","a.png",new byte[]{1,2,3}))).statusCode()).isEqualTo(400);
        assertThat(send("POST","/internal/post-media","alice","fake-internal",body(part("image","a.png",new byte[5_242_881]))).statusCode()).isEqualTo(413);
        assertThat(send("POST","/internal/post-media","alice","fake-internal",new byte[6_291_457]).statusCode()).isEqualTo(413);
    }
    @Test void exactFiveMiBValidPngWithMultipartOverheadIsAccepted() throws Exception {
        var response=send("POST","/internal/post-media","alice","fake-internal",body(part("image","a.png",ImageFixtures.paddedPng(5_242_880))));
        assertThat(response.statusCode()).isEqualTo(200);
    }
    @Test void invalidAndMissingIdsAreSafeAndContextIsIsolated() throws Exception {
        assertThat(send("GET","/post-media/invalid",null,null,null).statusCode()).isEqualTo(404);
        assertThat(send("GET","/post-media/"+UUID.randomUUID(),null,null,null).statusCode()).isEqualTo(404);
        assertThat(send("DELETE","/internal/post-media/"+UUID.randomUUID(),"alice","fake-internal",null).statusCode()).isEqualTo(204);
        assertThat(context.getBeansOfType(com.mongodb.client.MongoClient.class)).isEmpty();
        assertThat(context.getBeansOfType(com.stewie.file.FileServiceApplication.class)).isEmpty();
        assertThat(context.getBeansOfType(com.stewie.file.service.AvatarSagaConsumer.class)).isEmpty();
        var config=context.getBean(jakarta.servlet.MultipartConfigElement.class);
        assertThat(config.getMaxFileSize()).isEqualTo(5_242_880);assertThat(config.getMaxRequestSize()).isEqualTo(6_291_456);
    }
}
