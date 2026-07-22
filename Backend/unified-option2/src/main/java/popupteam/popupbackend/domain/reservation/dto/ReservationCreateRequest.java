package popupteam.popupbackend.domain.reservation.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import java.time.LocalDate;

@Getter
public class ReservationCreateRequest {
    @NotNull
    private Long popupId;

    // SLOT 모드 팝업이면 필수
    private Long slotId;

    // FREE 모드 팝업이면 필수 (방문 예정일)
    private LocalDate reservationDate;

    @NotNull @Min(1)
    private Integer partySize;
}