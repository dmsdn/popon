package popupteam.popupbackend.domain.cs.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class CsCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String content;
}