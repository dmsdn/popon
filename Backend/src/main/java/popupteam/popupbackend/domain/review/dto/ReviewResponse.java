package popupteam.popupbackend.domain.review.dto;

import popupteam.popupbackend.domain.review.Review;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class ReviewResponse {
    private final Long id;
    private final Long popupId;
    private final BigDecimal rating;
    private final String content;
    private final List<String> imageUrls;
    private final long likeCount;
    private final boolean likedByMe;
    private final LocalDate visitDate;
    private final boolean hidden;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    // 작성자 본인이 보는 경우(내가 쓴 리뷰 목록, 작성/수정 직후 응답)는 실제 내용 그대로 보여줌
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe) {
        this(review, imageUrls, likeCount, likedByMe, false);
    }

    // maskIfHidden=true면 신고로 숨김 처리된 후기는 내용을 안내 문구로 대체 (다른 사람이 보는 목록/상세용)
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe, boolean maskIfHidden) {
        this.id = review.getId();
        this.popupId = review.getPopupId();
        this.rating = review.getRating();
        boolean shouldMask = maskIfHidden && review.isHidden();
        this.content = shouldMask ? "신고처리된 후기입니다." : review.getContent();
        this.imageUrls = shouldMask ? List.of() : imageUrls;
        this.likeCount = likeCount;
        this.likedByMe = likedByMe;
        this.visitDate = review.getVisitDate();
        this.hidden = review.isHidden();
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }
}