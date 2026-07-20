package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Keyword;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KeywordRepository extends JpaRepository<Keyword, Long> {
}