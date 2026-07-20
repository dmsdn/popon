package popupteam.popupbackend.domain.reservation.dto;

import lombok.Getter;

@Getter
public class ReservationCancelRequest {
    private String cancelReason; // 선택 입력
}