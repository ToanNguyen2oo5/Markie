package org.stewie.search.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;
import org.stewie.search.entity.PostDocument;

@Repository
public interface PostSearchRepository extends ElasticsearchRepository<PostDocument,String> {
    Page<PostDocument> findByContentContaining(String content, Pageable pageable);
}
