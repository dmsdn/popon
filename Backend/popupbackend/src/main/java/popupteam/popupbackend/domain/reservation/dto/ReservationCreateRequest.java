package popupteam.popupbackend.domain.reservation.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class ReservationCreateRequest {
    @NotNull
    private Long slotId;
    @NotNull @Min(1)
    private Integer partySize;
}