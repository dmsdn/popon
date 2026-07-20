package com.popupplatform.backend.controller;

import com.popupplatform.backend.entity.Review;
import com.popupplatform.backend.repository.ReviewRepository;
import com.popupplatform.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
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
    public Review createReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body
    ) {
        Long customerId = extractCustomerId(authHeader);

        Review review = new Review();
        review.setCustomerId(customerId);
        review.setPopupId(Long.valueOf(body.get("popupId").toString()));
        review.setRating(new BigDecimal(body.get("rating").toString()));
        review.setContent((String) body.get("content"));

        return reviewRepository.save(review);
    }

    // 내가 쓴 리뷰 목록 조회
    @GetMapping
    public List<Review> getMyReviews(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);
        return reviewRepository.findByCustomerId(customerId);
    }

    // 리뷰 수정
    @PutMapping("/{id}")
    public Review updateReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        Long customerId = extractCustomerId(authHeader);

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없어요."));

        // 본인 리뷰인지 확인 (다른 사람 리뷰는 수정 못 하게)
        if (!review.getCustomerId().equals(customerId)) {
            throw new RuntimeException("본인이 작성한 리뷰만 수정할 수 있어요.");
        }

        review.setRating(new BigDecimal(body.get("rating").toString()));
        review.setContent((String) body.get("content"));

        return reviewRepository.save(review);
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

    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }
}