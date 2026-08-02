package com.stewie.post.repository;

import com.stewie.post.entity.Like;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface LikeRepository extends MongoRepository<Like,String> {

}
