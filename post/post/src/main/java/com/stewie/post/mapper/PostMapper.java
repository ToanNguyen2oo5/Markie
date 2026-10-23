package com.stewie.post.mapper;

import com.stewie.post.dto.response.PostResponse;
import com.stewie.post.entity.Post;
import org.mapstruct.AfterMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import java.util.ArrayList;

@Mapper(componentModel = "spring")
public interface PostMapper {
    PostResponse toPostResponse(Post post);

    @AfterMapping
    default void normalizeFiles(@MappingTarget PostResponse response) {
        if (response.getFiles() == null) {
            response.setFiles(new ArrayList<>());
        }
    }
}
