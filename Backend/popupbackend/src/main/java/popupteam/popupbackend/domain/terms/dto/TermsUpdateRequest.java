package popupteam.popupbackend.domain.terms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class TermsUpdateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String content;
}