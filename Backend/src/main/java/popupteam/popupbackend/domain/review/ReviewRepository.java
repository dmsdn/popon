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

    // 목록 응답에 별점을 실어 주기 위한 일괄 집계 (8/5).
    // 그전에는 별점이 상세 조회(findById)에서만 채워져서, 관리자 별점순 정렬처럼
    // 목록에서 별점이 필요한 화면이 만들 수 없었다. 팝업마다 단건 쿼리를 부르면
    // N+1이라(공용 DB에서 이미 한 번 데인 패턴 - PopupSlotService 참고) GROUP BY 한 방으로 집계.
    // hidden 필터는 단건 쿼리(findAverageRatingByPopupId)와 기준을 맞추기 위해 걸지 않는다 -
    // 목록과 상세의 별점이 서로 달라지면 그게 더 큰 혼란이다.
    @Query("SELECT r.popupId, AVG(r.rating), COUNT(r) FROM Review r GROUP BY r.popupId")
    List<Object[]> avgRatingAndCountGroupByPopupId();

    // 홈 화면 "실시간 후기 모음"용 - 플랫폼 전체 최신 후기
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);
}