package popupteam.popupbackend.domain.report.dto;

import lombok.*;
import popupteam.popupbackend.domain.report.ReviewReport;
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

    public static ReportResponse from(ReviewReport r) {
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
                .build();
    }
}