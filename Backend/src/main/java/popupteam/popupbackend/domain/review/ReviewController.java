package popupteam.popupbackend.domain.review;

import popupteam.popupbackend.domain.review.Review;
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

    // 특정 팝업스토어의 후기 목록 (최신순, 페이징) - 신고로 숨김 처리된 리뷰는 제외 (다른 팀원 작업용, 남겨둠)
    Page<Review> findByPopupIdAndHiddenFalseOrderByCreatedAtDesc(Long popupId, Pageable pageable);

    // 중복 작성 방지용 체크
    boolean existsByCustomerIdAndPopupId(Long customerId, Long popupId);

    // 특정 팝업스토어 후기 개수
    long countByPopupId(Long popupId);

    // 특정 팝업스토어 평균 별점
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.popupId = :popupId")
    BigDecimal findAverageRatingByPopupId(@Param("popupId") Long popupId);

    // 인기 팝업 랭킹 계산용 - 팝업별 후기 개수를 한 번에 집계
    @Query("SELECT r.popupId, COUNT(r) FROM Review r GROUP BY r.popupId")
    List<Object[]> countAllGroupByPopupId();

    // 홈 화면 "실시간 후기 모음"용 - 플랫폼 전체 최신 후기
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 신고로 숨김 처리된 리뷰 제외 버전 (다른 팀원 작업용, 남겨둠)
    Page<Review> findAllByHiddenFalseOrderByCreatedAtDesc(Pageable pageable);
}