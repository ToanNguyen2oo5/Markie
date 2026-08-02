package com.stewie.post.mapper;

import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.entity.Post;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PostMapper {
    PostResponse toPostResponse(Post post);
}
