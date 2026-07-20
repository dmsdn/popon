package com.popupplatform.backend.dto;

import com.popupplatform.backend.entity.Review;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
public class ReviewResponse {
    private final Long id;
    private final Long popupId;
    private final BigDecimal rating;
    private final String content;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    // Entity를 받아서 DTO로 변환하는 생성자
    public ReviewResponse(Review review) {
        this.id = review.getId();
        this.popupId = review.getPopupId();
        this.rating = review.getRating();
        this.content = review.getContent();
        this.createdAt = review.getCreatedAt();
        this.updatedAt = review.getUpdatedAt();
    }
}