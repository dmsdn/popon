package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {
    List<ReviewImage> findByReviewIdOrderBySortOrder(Long reviewId);
    void deleteByReviewId(Long reviewId);
}