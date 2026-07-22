package popupteam.popupbackend.domain.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class QrCheckinRequest {
    @NotBlank
    private String qrToken;
}