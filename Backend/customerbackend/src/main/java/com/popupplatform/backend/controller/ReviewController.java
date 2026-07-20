package com.popupplatform.backend.controller;

import com.popupplatform.backend.dto.ReviewRequest;
import com.popupplatform.backend.dto.ReviewResponse;
import com.popupplatform.backend.entity.Review;
import com.popupplatform.backend.repository.ReviewRepository;
import com.popupplatform.backend.util.JwtUtil;
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

    private final ReviewRepository reviewRepository;
    private final JwtUtil jwtUtil;

    // 리뷰 작성
    @PostMapping
    public ReviewResponse createReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request
    ) {
        Long customerId = extractCustomerId(authHeader);
        validateRating(request.getRating());

        Review review = new Review();
        review.setCustomerId(customerId);
        review.setPopupId(request.getPopupId());
        review.setRating(request.getRating());
        review.setContent(request.getContent());

        try {
            Review saved = reviewRepository.save(review);
            return new ReviewResponse(saved);
        } catch (DataIntegrityViolationException e) {
            // UNIQUE(customer_id, popup_id) 제약 위반 시
            throw new IllegalStateException("이미 이 팝업에 리뷰를 작성하셨어요.");
        }
    }

    // 내가 쓴 리뷰 목록 조회
    @GetMapping
    public List<ReviewResponse> getMyReviews(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);
        return reviewRepository.findByCustomerId(customerId)
                .stream()
                .map(ReviewResponse::new)
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

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없어요."));

        if (!review.getCustomerId().equals(customerId)) {
            throw new RuntimeException("본인이 작성한 리뷰만 수정할 수 있어요.");
        }

        review.setRating(request.getRating());
        review.setContent(request.getContent());

        Review saved = reviewRepository.save(review);
        return new ReviewResponse(saved);
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
        return Map.of("success", true);
    }

    private void validateRating(BigDecimal rating) {
        if (rating.compareTo(new BigDecimal("0.5")) < 0 || rating.compareTo(new BigDecimal("5.0")) > 0) {
            throw new IllegalArgumentException("별점은 0.5점에서 5점 사이여야 해요.");
        }
    }

    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }
}