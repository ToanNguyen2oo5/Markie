package com.stewie.post;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.mongodb.MongoClientSettings;
import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClients;
import com.stewie.post.entity.Like;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(properties = {
        "app.moderation.api-key=context-test-fake-key",
        "app.moderation.base-url=http://127.0.0.1:1"
})
class PostApplicationTests {

    private static final String DATABASE = "markie_context_test_" + UUID.randomUUID().toString().replace("-", "");

    @Autowired MongoTemplate mongo;

    @DynamicPropertySource
    static void isolatedMongo(DynamicPropertyRegistry registry) {
        // Keep contextLoads real, but never seed/write the developer's database.
        var yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yaml"));
        String uri = System.getenv().getOrDefault("MARKIE_TEST_MONGODB_URI",
                yaml.getObject().getProperty("spring.data.mongodb.uri"));
        var connection = new ConnectionString(uri);
        var settings = MongoClientSettings.builder().applyConnectionString(connection).build();
        try (var client = MongoClients.create(settings)) {
            var likes = client.getDatabase(DATABASE).getCollection("likes");
            likes.insertMany(List.of(
                    new Document("target_type", "POST").append("target_id", "synthetic-target-one").append("user_id", "synthetic-user"),
                    new Document("target_type", "COMMENT").append("target_id", "synthetic-target-two").append("user_id", "synthetic-user")));
        }
        registry.add("spring.data.mongodb.uri", () -> uri);
        registry.add("spring.data.mongodb.database", () -> DATABASE);
    }

    @Test
    void contextLoads() {
        assertThat(mongo.getDb().getName()).isEqualTo(DATABASE);
    }

    @Test
    void postLikeIndexCoexistsWithTargetLikesAndStillRejectsDuplicatePostLikes() {
        var index = mongo.getCollection("likes").listIndexes().into(new ArrayList<>())
                .stream().filter(i -> "uniq_post_user_like".equals(i.getString("name"))).findFirst().orElseThrow();
        assertThat(index.getBoolean("unique")).isTrue();
        assertThat(index.get("partialFilterExpression", Document.class))
                .isEqualTo(new Document("post_id", new Document("$exists", true)));
        assertThat(mongo.getCollection("likes").countDocuments(new Document("post_id", new Document("$exists", false))))
                .isEqualTo(2);
        mongo.insert(Like.builder().postId("synthetic-post-one").userId("synthetic-user").build());
        mongo.insert(Like.builder().postId("synthetic-post-two").userId("synthetic-user").build());
        assertThatThrownBy(() -> mongo.insert(Like.builder().postId("synthetic-post-one").userId("synthetic-user").build()))
                .isInstanceOf(DuplicateKeyException.class);
    }

}
