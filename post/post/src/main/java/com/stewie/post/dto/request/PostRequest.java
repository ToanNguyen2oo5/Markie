package com.stewie.post.dto.request;

import com.stewie.post.entity.PostStats;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PostRequest {

    @NotBlank(message = "POST_CONTENT_REQUIRED")
    @Size(max = 500, message = "POST_CONTENT_TOO_LONG")
    String content;

    PostStats stats = new PostStats();


}
