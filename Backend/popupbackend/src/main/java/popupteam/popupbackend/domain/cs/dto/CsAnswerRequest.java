package popupteam.popupbackend.domain.cs.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class CsAnswerRequest {
    @NotBlank
    private String answerContent;
}