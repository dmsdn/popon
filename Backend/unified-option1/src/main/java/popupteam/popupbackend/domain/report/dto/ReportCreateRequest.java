package popupteam.popupbackend.domain.report.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class ReportCreateRequest {
    @NotNull
    private Long reviewId;

    @NotNull
    private String reason; // "ABUSE", "SPAM", "FALSE_INFO", "OTHER"

    private String detail;
}