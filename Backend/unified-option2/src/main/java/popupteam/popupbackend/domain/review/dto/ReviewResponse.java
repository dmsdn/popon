package popupteam.popupbackend.domain.review.dto;

import popupteam.popupbackend.domain.review.Review;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import popupteam.popupbackend.domain.review.Review;
import lombok.Getter;
import java.math.BigDecimal;
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
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    // Entity를 받아서 DTO로 변환하는 생성자
    public ReviewResponse(Review review, List<String> imageUrls, long likeCount, boolean likedByMe) {
        this.id = review.getId();
        this.popupId = review.getPopupId();
        this.rating = review.getRating();
        this.content = review.getContent();
        this.imageUrls = imageUrls;
        this.likeCount = likeCount;
        this.likedByMe = likedByMe;
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }
}