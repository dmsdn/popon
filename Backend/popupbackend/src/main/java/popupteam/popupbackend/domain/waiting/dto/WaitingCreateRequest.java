package popupteam.popupbackend.domain.waiting.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class WaitingCreateRequest {
    @NotBlank
    private String phoneNumber;

    @NotNull @Min(1)
    private Integer partySize;
}