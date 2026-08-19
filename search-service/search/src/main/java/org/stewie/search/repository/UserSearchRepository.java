package org.stewie.search.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.stewie.search.entity.UserDocument;

public interface UserSearchRepository extends ElasticsearchRepository<UserDocument,String> {
    Page<UserDocument> findByUsernameContainingOrFirstNameContainingOrLastNameContaining(
            String username, String firstName, String lastName, Pageable pageable);
}
