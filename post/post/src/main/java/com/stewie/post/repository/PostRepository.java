package com.stewie.post.repository;

import com.stewie.post.entity.Post;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PostRepository extends MongoRepository<Post, String> {
    Slice<Post> findByUserIdOrderByIdDesc(String userId, Pageable pageable);
    Slice<Post> findByIdLessThanAndUserIdOrderByIdDesc(String id, String userId, Pageable pageable);
}
