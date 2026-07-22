package popupteam.popupbackend.domain.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class InquiryCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String content;
}