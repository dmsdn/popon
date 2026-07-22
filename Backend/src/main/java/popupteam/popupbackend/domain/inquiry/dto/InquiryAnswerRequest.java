package popupteam.popupbackend.domain.inquiry.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class InquiryAnswerRequest {
    @NotBlank
    private String answerContent;
}