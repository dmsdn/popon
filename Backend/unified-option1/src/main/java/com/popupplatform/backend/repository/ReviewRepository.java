package com.popupplatform.backend.repository;

import com.popupplatform.backend.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    // 내가 쓴 리뷰 목록
    List<Review> findByCustomerId(Long customerId);

    // 특정 팝업스토어의 후기 목록 (최신순, 페이징)
    Page<Review> findByPopupIdOrderByCreatedAtDesc(Long popupId, Pageable pageable);

    // 중복 작성 방지용 체크
    boolean existsByCustomerIdAndPopupId(Long customerId, Long popupId);

    // 특정 팝업스토어 후기 개수
    long countByPopupId(Long popupId);

    // 특정 팝업스토어 평균 별점
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.popupId = :popupId")
    BigDecimal findAverageRatingByPopupId(@Param("popupId") Long popupId);
}