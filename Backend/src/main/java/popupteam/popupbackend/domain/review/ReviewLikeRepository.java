package popupteam.popupbackend.domain.review;

import popupteam.popupbackend.domain.review.ReviewLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReviewLikeRepository extends JpaRepository<ReviewLike, ReviewLike.PK> {
    Optional<ReviewLike> findByReviewIdAndCustomerId(Long reviewId, Long customerId);
    long countByReviewId(Long reviewId);
}