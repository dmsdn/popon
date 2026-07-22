package popupteam.popupbackend.domain.review;

import popupteam.popupbackend.domain.review.dto.ReviewRequest;
import popupteam.popupbackend.domain.review.dto.ReviewResponse;
import popupteam.popupbackend.domain.review.Review;
import popupteam.popupbackend.domain.review.ReviewImage;
import popupteam.popupbackend.domain.review.ReviewLike;
import popupteam.popupbackend.domain.review.ReviewImageRepository;
import popupteam.popupbackend.domain.review.ReviewLikeRepository;
import popupteam.popupbackend.domain.review.ReviewRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private static final int MAX_IMAGE_COUNT = 5;

    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final JwtUtil jwtUtil;

    // 리뷰 작성
    @PostMapping
    public ReviewResponse createReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request
    ) {
        Long customerId = extractCustomerId(authHeader);
        validateRating(request.getRating());
        validateImageCount(request.getImageUrls());

        Review review = new Review();
        review.setCustomerId(customerId);
        review.setPopupId(request.getPopupId());
        review.setRating(request.getRating());
        review.setContent(request.getContent());

        Review saved;
        try {
            saved = reviewRepository.save(review);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalStateException("이미 이 팝업에 리뷰를 작성하셨어요.");
        }

        List<String> savedImageUrls = saveImages(saved.getId(), request.getImageUrls());

        return new ReviewResponse(saved, savedImageUrls, 0, false);
    }

    // 내가 쓴 리뷰 목록 조회
    @GetMapping
    public List<ReviewResponse> getMyReviews(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);

        return reviewRepository.findByCustomerId(customerId)
                .stream()
                .map(review -> {
                    List<String> imageUrls = reviewImageRepository
                            .findByReviewIdOrderBySortOrder(review.getId())
                            .stream()
                            .map(ReviewImage::getImageUrl)
                            .toList();
                    long likeCount = reviewLikeRepository.countByReviewId(review.getId());
                    boolean likedByMe = reviewLikeRepository
                            .findByReviewIdAndCustomerId(review.getId(), customerId)
                            .isPresent();
                    return new ReviewResponse(review, imageUrls, likeCount, likedByMe);
                })
                .toList();
    }

    // 리뷰 수정
    @PutMapping("/{id}")
    public ReviewResponse updateReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody ReviewRequest request
    ) {
        Long customerId = extractCustomerId(authHeader);
        validateRating(request.getRating());
        validateImageCount(request.getImageUrls());

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없어요."));

        if (!review.getCustomerId().equals(customerId)) {
            throw new RuntimeException("본인이 작성한 리뷰만 수정할 수 있어요.");
        }

        review.setRating(request.getRating());
        review.setContent(request.getContent());
        Review saved = reviewRepository.save(review);

        reviewImageRepository.deleteByReviewId(id);
        List<String> savedImageUrls = saveImages(id, request.getImageUrls());

        long likeCount = reviewLikeRepository.countByReviewId(id);
        boolean likedByMe = reviewLikeRepository.findByReviewIdAndCustomerId(id, customerId).isPresent();

        return new ReviewResponse(saved, savedImageUrls, likeCount, likedByMe);
    }

    // 리뷰 삭제
    @DeleteMapping("/{id}")
    public Map<String, Object> deleteReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Long customerId = extractCustomerId(authHeader);

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없어요."));

        if (!review.getCustomerId().equals(customerId)) {
            throw new RuntimeException("본인이 작성한 리뷰만 삭제할 수 있어요.");
        }

        reviewRepository.delete(review);
        // review_image, review_like는 ON DELETE CASCADE로 자동 삭제됨

        return Map.of("success", true);
    }

    // 좋아요 누르기
    @PostMapping("/{id}/like")
    public Map<String, Object> likeReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Long customerId = extractCustomerId(authHeader);

        if (reviewLikeRepository.findByReviewIdAndCustomerId(id, customerId).isEmpty()) {
            ReviewLike like = new ReviewLike();
            like.setReviewId(id);
            like.setCustomerId(customerId);
            reviewLikeRepository.save(like);
        }

        long likeCount = reviewLikeRepository.countByReviewId(id);
        return Map.of("liked", true, "likeCount", likeCount);
    }

    // 좋아요 취소
    @DeleteMapping("/{id}/like")
    public Map<String, Object> unlikeReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Long customerId = extractCustomerId(authHeader);

        reviewLikeRepository.findByReviewIdAndCustomerId(id, customerId)
                .ifPresent(reviewLikeRepository::delete);

        long likeCount = reviewLikeRepository.countByReviewId(id);
        return Map.of("liked", false, "likeCount", likeCount);
    }

    private List<String> saveImages(Long reviewId, List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return List.of();
        }

        for (int i = 0; i < imageUrls.size(); i++) {
            ReviewImage image = new ReviewImage();
            image.setReviewId(reviewId);
            image.setImageUrl(imageUrls.get(i));
            image.setSortOrder(i);
            reviewImageRepository.save(image);
        }

        return imageUrls;
    }

    private void validateRating(BigDecimal rating) {
        if (rating.compareTo(new BigDecimal("0.5")) < 0 || rating.compareTo(new BigDecimal("5.0")) > 0) {
            throw new IllegalArgumentException("별점은 0.5점에서 5점 사이여야 해요.");
        }
    }

    private void validateImageCount(List<String> imageUrls) {
        if (imageUrls != null && imageUrls.size() > MAX_IMAGE_COUNT) {
            throw new IllegalArgumentException("사진은 최대 " + MAX_IMAGE_COUNT + "장까지 첨부할 수 있어요.");
        }
    }

    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }
}