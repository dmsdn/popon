package popupteam.popupbackend.domain.reservation.dto;

import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
public class ReservationChangeRequest {
    // SLOT 모드 팝업이면 필수 (변경할 새 시간대)
    private Long newSlotId;

    // FREE 모드 팝업이면 필수 (변경할 새 방문일, 미입력 시 기존 날짜 유지)
    private LocalDate newReservationDate;

    // 인원수도 함께 바꾸고 싶으면 입력 (미입력 시 기존 인원 유지)
    private Integer partySize;

    // FREE 모드에서 방문 시각 변경 시 (선택입력, 미입력 시 기존 시각 유지)
    private LocalTime newReservationTime;
}