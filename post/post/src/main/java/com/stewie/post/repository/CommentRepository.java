package com.stewie.post.repository;

import com.stewie.post.entity.Comment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends MongoRepository<Comment, String> {

    Slice<Comment> findByPostIdAndParentIdIsNullOrderByIdDesc(String postId, Pageable pageable);

    Slice<Comment> findByIdLessThanAndPostIdAndParentIdIsNullOrderByIdDesc(String id, String postId, Pageable pageable);

    Slice<Comment> findByParentIdOrderByIdDesc(String parentId, Pageable pageable);

    Slice<Comment> findByIdLessThanAndParentIdOrderByIdDesc(String id, String parentId, Pageable pageable);
}
