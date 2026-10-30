package com.stewie.post.repository;

import com.stewie.post.entity.Comment;
import com.stewie.post.entity.Post;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StatsUpdater {

    MongoTemplate mongoTemplate;

    public void incPost(String postId, String field, long delta) {
        if (delta == 0) return;
        Query query = new Query(Criteria.where("_id").is(postId));
        mongoTemplate.updateFirst(query, new Update().inc(field, delta), Post.class);
        if (delta < 0) {
            Query clampQuery = new Query(Criteria.where("_id").is(postId).and(field).lt(0));
            mongoTemplate.updateFirst(clampQuery, new Update().set(field, 0L), Post.class);
        }
    }

    public void incComment(String commentId, String field, long delta) {
        if (delta == 0) return;
        Query query = new Query(Criteria.where("_id").is(commentId));
        mongoTemplate.updateFirst(query, new Update().inc(field, delta), Comment.class);
        if (delta < 0) {
            Query clampQuery = new Query(Criteria.where("_id").is(commentId).and(field).lt(0));
            mongoTemplate.updateFirst(clampQuery, new Update().set(field, 0L), Comment.class);
        }
    }
}

