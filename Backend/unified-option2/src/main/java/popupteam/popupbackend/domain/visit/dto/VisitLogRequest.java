package popupteam.popupbackend.domain.visit.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class VisitLogRequest {
    @NotBlank
    private String visitorKey;

    @NotBlank
    private String appSource;
}