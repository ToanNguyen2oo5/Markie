package com.stewie.post.mapper;

import com.stewie.post.dto.request.CommentRequest;
import com.stewie.post.dto.response.CommentResponse;
import com.stewie.post.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface CommentMapper {
    Comment toComment(CommentRequest request);
    CommentResponse toCommentResponse(Comment comment);
    void updateComment(@MappingTarget Comment comment, CommentRequest request);
}
