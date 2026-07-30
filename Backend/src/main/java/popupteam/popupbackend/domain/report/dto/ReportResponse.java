package popupteam.popupbackend.domain.report.dto;

import lombok.*;
import popupteam.popupbackend.domain.report.ReviewReport;
import popupteam.popupbackend.domain.review.Review;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Builder
public class ReportResponse {
    private Long id;
    private Long reviewId;
    private Long reporterCustomerId;
    private String reporterNickname;
    private String reason;
    private String detail;
    private String status;
    private String processedBy;
    private LocalDateTime processedAt;
    private LocalDateTime createdAt;

    // 관리자 화면에서 신고 내용만 보고도 판단할 수 있게 신고당한 후기 자체도 같이 내려줌 (후기가 이미 삭제됐으면 전부 null)
    private Long reviewPopupId;
    private BigDecimal reviewRating;
    private String reviewContent;
    private Long reviewAuthorCustomerId;
    private boolean reviewHidden;

    public static ReportResponse from(ReviewReport r, Review review) {
        return ReportResponse.builder()
                .id(r.getId())
                .reviewId(r.getReviewId())
                .reporterCustomerId(r.getReporter().getId())
                .reporterNickname(r.getReporter().getNickname())
                .reason(r.getReason().name())
                .detail(r.getDetail())
                .status(r.getStatus().name())
                .processedBy(r.getProcessedBy())
                .processedAt(r.getProcessedAt())
                .createdAt(r.getCreatedAt())
                .reviewPopupId(review != null ? review.getPopupId() : null)
                .reviewRating(review != null ? review.getRating() : null)
                .reviewContent(review != null ? review.getContent() : null)
                .reviewAuthorCustomerId(review != null ? review.getCustomerId() : null)
                .reviewHidden(review != null && review.isHidden())
                .build();
    }
}