package popupteam.popupbackend.domain.review;

import popupteam.popupbackend.domain.review.dto.ReviewRequest;
import popupteam.popupbackend.domain.review.dto.ReviewResponse;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.reservation.EntryStatus;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import popupteam.popupbackend.domain.waiting.WaitingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@RestController
@RequestMapping("/api/customer/reviews")
@RequiredArgsConstructor
@Transactional
public class ReviewController {

    private static final int MAX_IMAGE_COUNT = 5;

    private final ReviewRepository reviewRepository;
    private final ReviewImageRepository reviewImageRepository;
    private final ReviewLikeRepository reviewLikeRepository;
    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;
    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;

    // 리뷰 작성
    @PostMapping
    public ReviewResponse createReview(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody ReviewRequest request
    ) {
        Long customerId = extractCustomerId(authHeader);
        validateImageCount(request.getImageUrls());

        // 버그 수정: content가 비어있어도 DB NOT NULL 제약 위반(DataIntegrityViolationException)으로
        // 떨어지는데, 그 예외를 무조건 "이미 리뷰를 작성하셨어요"로 바꿔버리고 있었음. 원인을 구분하지
        // 않고 catch(DataIntegrityViolationException)에서 전부 중복 메시지로 뭉뚱그려진 게 문제였음 -
        // 여기서 미리 걸러내면 그 catch 블록은 실제 중복(unique constraint) 케이스만 타게 된다.
        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("내용을 입력해주세요.");
        }

        // 방문 여부는 작성 가능 여부를 막는 조건이 아니라, 댓글 유형(방문자 후기/일반 댓글)을 구분하기 위한 값이다.
        // 방문자는 별점이 있는 "후기", 방문 안 한 사람은 별점이 없는 "댓글"로 취급한다.
        boolean visited = reservationRepository.existsByPopup_IdAndCustomer_IdAndEntryStatus(
                request.getPopupId(), customerId, EntryStatus.CHECKED_IN)
                || waitingQueueRepository.existsByPopupIdAndCustomerIdAndStatus(
                request.getPopupId(), customerId, WaitingStatus.ENTERED);

        if (visited) {
            validateRating(request.getRating());
        }

        Review review = new Review();
        review.setCustomerId(customerId);
        review.setPopupId(request.getPopupId());
        review.setRating(visited ? request.getRating() : null);
        review.setContent(request.getContent());
        review.setVisitDate(visited ? request.getVisitDate() : null);
        review.setVisited(visited);

        Review saved;
        try {
            saved = reviewRepository.save(review);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 이 팝업에 리뷰를 작성하셨어요.");
        }

        List<String> savedImageUrls = saveImages(saved.getId(), request.getImageUrls());

        return new ReviewResponse(saved, savedImageUrls, 0, false, getNickname(customerId));
    }

    // 내가 쓴 리뷰 목록 조회
    @GetMapping
    public List<ReviewResponse> getMyReviews(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);

        List<Review> reviews = reviewRepository.findByCustomerId(customerId);
        Map<Long, String> nicknames = getNicknames(reviews);

        return reviews.stream()
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
                    return new ReviewResponse(review, imageUrls, likeCount, likedByMe,
                            nicknames.get(review.getCustomerId()));
                })
                .toList();
    }

    // 특정 팝업의 후기 목록 (공개, 로그인 불필요 - 팝업 상세페이지용)
    @GetMapping("/popup/{popupId}")
    public List<ReviewResponse> getPopupReviews(
            @PathVariable Long popupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        Long customerId = (authHeader != null) ? extractCustomerId(authHeader) : null;
        Pageable pageable = PageRequest.of(page, size);

        List<Review> reviews = reviewRepository.findByPopupIdOrderByCreatedAtDesc(popupId, pageable)
                .getContent();
        Map<Long, String> nicknames = getNicknames(reviews);

        return reviews.stream()
                .map(review -> buildResponse(review, customerId, nicknames.get(review.getCustomerId())))
                .toList();
    }

    // 특정 팝업 후기 개수 (공개, 로그인 불필요 - 카드/상세페이지에서 "후기 12개" 같은 뱃지용)
    @GetMapping("/popup/{popupId}/count")
    public Map<String, Object> getPopupReviewCount(@PathVariable Long popupId) {
        Map<String, Object> result = new HashMap<>();
        result.put("popupId", popupId);
        result.put("reviewCount", reviewRepository.countByPopupId(popupId));
        return result;
    }

    // 여러 팝업의 후기 개수를 한 번에 (공개) - 목록/리스트 화면에서 팝업마다 개별 호출하지 않도록
    @GetMapping("/counts")
    public Map<Long, Long> getReviewCounts() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : reviewRepository.countAllGroupByPopupId()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return counts;
    }

    // 플랫폼 전체 최신 후기 (홈 화면 "실시간 후기 모음"용, 공개)
    @GetMapping("/recent")
    public List<ReviewResponse> getRecentReviews(@RequestParam(defaultValue = "10") int limit) {
        Pageable pageable = PageRequest.of(0, limit);

        List<Review> reviews = reviewRepository.findAllByOrderByCreatedAtDesc(pageable).getContent();
        Map<Long, String> nicknames = getNicknames(reviews);

        return reviews.stream()
                .map(review -> buildResponse(review, null, nicknames.get(review.getCustomerId())))
                .toList();
    }

    // 공통 응답 조립 (비회원이면 customerId null → likedByMe는 항상 false)
    private ReviewResponse buildResponse(Review review, Long customerId, String nickname) {
        List<String> imageUrls = reviewImageRepository
                .findByReviewIdOrderBySortOrder(review.getId())
                .stream()
                .map(ReviewImage::getImageUrl)
                .toList();
        long likeCount = reviewLikeRepository.countByReviewId(review.getId());
        boolean likedByMe = (customerId != null) && reviewLikeRepository
                .findByReviewIdAndCustomerId(review.getId(), customerId)
                .isPresent();
        // 남이 보는 목록·상세라 숨김 마스킹(jsw)과 작성자 닉네임(jmy)이 둘 다 필요하다.
        return new ReviewResponse(review, imageUrls, likeCount, likedByMe, true, nickname);
    }

    // 리뷰 수정
    @PutMapping("/{id}")
    public ReviewResponse updateReview(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody ReviewRequest request
    ) {
        Long customerId = extractCustomerId(authHeader);
        validateImageCount(request.getImageUrls());

        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new IllegalArgumentException("내용을 입력해주세요.");
        }

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("리뷰를 찾을 수 없어요."));

        if (!review.getCustomerId().equals(customerId)) {
            throw new RuntimeException("본인이 작성한 리뷰만 수정할 수 있어요.");
        }

        // visited는 최초 작성 시점에 정해진 값을 그대로 유지한다 (댓글이 나중에 방문자 후기로 바뀌거나 그 반대인 일은 없음)
        if (review.isVisited()) {
            validateRating(request.getRating());
            review.setRating(request.getRating());
        } else {
            review.setRating(null);
        }
        review.setContent(request.getContent());
        Review saved = reviewRepository.save(review);

        reviewImageRepository.deleteByReviewId(id);
        List<String> savedImageUrls = saveImages(id, request.getImageUrls());

        long likeCount = reviewLikeRepository.countByReviewId(id);
        boolean likedByMe = reviewLikeRepository.findByReviewIdAndCustomerId(id, customerId).isPresent();

        return new ReviewResponse(saved, savedImageUrls, likeCount, likedByMe, getNickname(customerId));
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
        if (rating == null) {
            throw new IllegalArgumentException("방문자 후기는 별점을 입력해야 해요.");
        }
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

    // 리뷰 하나 작성/수정 직후 등, 단건일 때 쓰는 닉네임 조회
    private String getNickname(Long customerId) {
        return customerRepository.findById(customerId).map(Customer::getNickname).orElse("탈퇴한 회원");
    }

    // 목록 조회할 때 리뷰마다 따로따로 조회(N+1)하지 않고 한 번에 배치 조회
    private Map<Long, String> getNicknames(List<Review> reviews) {
        List<Long> customerIds = reviews.stream().map(Review::getCustomerId).distinct().toList();
        if (customerIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> result = new HashMap<>();
        for (Customer c : customerRepository.findAllById(customerIds)) {
            result.put(c.getId(), c.getNickname());
        }
        return result;
    }
}