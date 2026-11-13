package com.stewie.post.moderation;

import java.io.IOException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.context.properties.bind.validation.BindValidationException;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ModerationConfigurationTest {

    // Do not read developer machine credentials, JVM properties, or infrastructure.
    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withInitializer(context -> {
                var sources = context.getEnvironment().getPropertySources();
                sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
                sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
            })
            .withUserConfiguration(ModerationConfiguration.class);

    private ApplicationContextRunner validRunner() {
        return runner.withPropertyValues(
                "app.moderation.api-key=fake-unit-test-key",
                "app.moderation.base-url=http://localhost:12345",
                "app.moderation.model=test-model",
                "app.moderation.connect-timeout-ms=123",
                "app.moderation.read-timeout-ms=456");
    }

    private ApplicationContextRunner yamlRunner() throws IOException {
        var sources = new YamlPropertySourceLoader().load(
                "application", new ClassPathResource("application.yaml", ModerationConfigurationTest.class.getClassLoader()));
        return runner.withInitializer(context -> sources.forEach(
                source -> context.getEnvironment().getPropertySources().addLast(source)));
    }

    @Test
    void bindsYamlDefaultsAndPreservesProfileConfiguration() throws IOException {
        yamlRunner().withPropertyValues("OPENAI_API_KEY=fake-unit-test-key").run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(ModerationProperties.class).hasSingleBean(RestClient.class);
            var properties = context.getBean(ModerationProperties.class);
            assertThat(properties.getApiKey()).isEqualTo("fake-unit-test-key");
            assertThat(properties.getBaseUrl()).isEqualTo("https://api.openai.com");
            assertThat(properties.getModel()).isEqualTo("omni-moderation-latest");
            assertThat(properties.getConnectTimeoutMs()).isEqualTo(2000);
            assertThat(properties.getReadTimeoutMs()).isEqualTo(5000);
            assertThat(context.getEnvironment().getProperty("app.services.profile.url"))
                    .isEqualTo("http://localhost:8081/profile");
        });
    }

    @Test
    void bindsEnvironmentPlaceholdersForStubAndModel() throws IOException {
        yamlRunner().withPropertyValues(
                "OPENAI_API_KEY=fake-unit-test-key",
                "OPENAI_MODERATION_BASE_URL=http://localhost:12345",
                "OPENAI_MODERATION_MODEL=test-model").run(context -> {
            assertThat(context).hasNotFailed();
            var properties = context.getBean(ModerationProperties.class);
            assertThat(properties.getBaseUrl()).isEqualTo("http://localhost:12345");
            assertThat(properties.getModel()).isEqualTo("test-model");
        });
    }

    @Test
    void missingEnvironmentKeyFailsWithActualYaml() throws IOException {
        yamlRunner().run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(BindValidationException.class)
                    .hasStackTraceContaining("OPENAI_API_KEY");
        });
    }

    @Test
    void missingKeyFailsWithoutYaml() {
        runner.withPropertyValues(
                "app.moderation.base-url=http://localhost:12345",
                "app.moderation.model=test-model",
                "app.moderation.connect-timeout-ms=2000",
                "app.moderation.read-timeout-ms=5000").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(BindValidationException.class)
                    .hasStackTraceContaining("app.moderation.api-key");
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "api-key=", "api-key=   ", "model=", "model=   ", "base-url=", "base-url=   ",
        "connect-timeout-ms=0", "connect-timeout-ms=-1", "read-timeout-ms=0", "read-timeout-ms=-1"
    })
    void rejectsInvalidConfiguration(String property) {
        validRunner().withPropertyValues("app.moderation." + property).run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(BindValidationException.class)
                    .hasStackTraceContaining(property.substring(0, property.indexOf('=')));
        });
    }

    @Test
    void createsSingletonClientWithSeparateTimeoutsAndProviderHeaders() {
        validRunner().run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(ModerationProperties.class).hasSingleBean(RestClient.class);
            RestClient client = context.getBean("moderationRestClient", RestClient.class);
            assertThat(context.getBean("moderationRestClient")).isSameAs(client);
            assertThat(context.getBean(ModerationProperties.class).toString()).doesNotContain("fake-unit-test-key");

            var factory = ReflectionTestUtils.getField(client, "clientRequestFactory");
            assertThat(factory).isInstanceOf(SimpleClientHttpRequestFactory.class);
            assertThat(ReflectionTestUtils.getField(factory, "connectTimeout")).isEqualTo(123);
            assertThat(ReflectionTestUtils.getField(factory, "readTimeout")).isEqualTo(456);

            // Mock transport only: verifies URL and defaults without any network request.
            var builder = client.mutate();
            var server = MockRestServiceServer.bindTo(builder).build();
            server.expect(requestTo("http://localhost:12345/v1/moderations"))
                    .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-unit-test-key"))
                    .andExpect(header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE))
                    .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
            builder.build().post().uri("/v1/moderations").body("{}").retrieve().toBodilessEntity();
            server.verify();
        });
    }
}
