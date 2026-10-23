package com.stewie.post.dto.request.internal;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommitAttachmentRequest {
    String postId;
    String ownerId;
    List<String> fileIds;
}
