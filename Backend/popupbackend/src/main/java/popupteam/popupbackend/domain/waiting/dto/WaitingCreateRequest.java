package popupteam.popupbackend.domain.waiting.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class WaitingCreateRequest {
    // 비회원용 (customerId 없을 때 필수)
    private String name;
    private String email;

    @NotBlank
    private String phoneNumber;

    @NotNull @Min(1)
    private Integer partySize;
}