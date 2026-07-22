package popupteam.popupbackend.domain.review;

import popupteam.popupbackend.domain.review.ReviewImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewImageRepository extends JpaRepository<ReviewImage, Long> {
    List<ReviewImage> findByReviewIdOrderBySortOrder(Long reviewId);
    void deleteByReviewId(Long reviewId);
}