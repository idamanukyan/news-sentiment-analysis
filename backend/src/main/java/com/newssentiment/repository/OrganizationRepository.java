package com.newssentiment.repository;

import com.newssentiment.model.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findBySlug(String slug);

    Optional<Organization> findByName(String name);

    boolean existsBySlug(String slug);

    boolean existsByName(String name);

    List<Organization> findByActiveTrue();

    long countByActiveTrue();
}
