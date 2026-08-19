package org.stewie.search.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;
import org.stewie.search.dto.PageResponse;
import org.stewie.search.entity.PostDocument;
import org.stewie.search.entity.UserDocument;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SearchService {

    ElasticsearchOperations elasticsearchOperations;

    public PageResponse<PostDocument> searchPosts(String keyword, Pageable pageable){
        var query = NativeQuery.builder()
                .withQuery(q -> q.multiMatch(m -> m
                        .fields("content", "username")
                        .query(keyword)
                        .fuzziness("AUTO")

                ))
                .withPageable(pageable)
                .build();

        SearchHits<PostDocument> hits = elasticsearchOperations.search(query, PostDocument.class);
        List<PostDocument> content = hits.stream().map(SearchHit::getContent).toList();

        long totalHits = hits.getTotalHits();
        int pageSize = pageable.getPageSize();
        int totalPages = (int) Math.ceil((double) totalHits / pageSize);

        return PageResponse.<PostDocument>builder()
                .items(content)
                .currentPage(pageable.getPageNumber())
                .pageSize(pageSize)
                .totalElements(totalHits)
                .totalPages(totalPages)
                .isLast(pageable.getPageNumber() >= totalPages - 1)
                .build();
    }



    public PageResponse<UserDocument> searchUsers(String keyword, Pageable pageable) {
        var query = NativeQuery.builder()
                .withQuery(q -> q.multiMatch(m -> m
                        .fields("username^3", "firstName^2", "lastName^2", "email") // Boost điểm cho username
                        .query(keyword)
                        .fuzziness("AUTO")
                ))
                .withPageable(pageable)
                .build();
        SearchHits<UserDocument> hits = elasticsearchOperations.search(query, UserDocument.class);
        List<UserDocument> content = hits.stream().map(SearchHit::getContent).toList();

        long totalHits = hits.getTotalHits();
        int pageSize = pageable.getPageSize();
        int totalPages = (int) Math.ceil((double) totalHits / pageSize);

        return PageResponse.<UserDocument>builder()
                .items(content)
                .currentPage(pageable.getPageNumber())
                .pageSize(pageSize)
                .totalElements(totalHits)
                .totalPages(totalPages)
                .isLast(pageable.getPageNumber() >= totalPages - 1)
                .build();
    }
}

