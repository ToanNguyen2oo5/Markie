package com.stewie.file.postmedia;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.*;

@Document(collection = "post_media")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PostMedia {
    @Id private String id;
    private String ownerId;
    private String contentType;
    private long size;
    private int width;
    private int height;
    // Retain ownership on compensation retries; never expose tombstones publicly.
    private boolean deleted;
}
