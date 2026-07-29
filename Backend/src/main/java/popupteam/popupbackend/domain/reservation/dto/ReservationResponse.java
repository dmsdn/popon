package popupteam.popupbackend.domain.reservation.dto;

import lombok.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Builder
public class ReservationResponse {
    private Long id;
    private Long popupId;
    private Long slotId; // FREE 모드면 null
    private LocalDate reservationDate;
    private LocalTime reservationTime; // FREE 모드에서 시각을 선택했을 때만 값 있음, 그 외엔 null
    private Long customerId;
    private Integer partySize;
    private String status;
    private LocalDateTime createdAt;
    private String entryStatus;
    private String qrToken; // 참가자 본인 조회용 (QR 렌더링에 사용)

    public static ReservationResponse from(Reservation r) {
        return ReservationResponse.builder()
                .id(r.getId())
                .popupId(r.getPopup().getId())
                .slotId(r.getSlot() != null ? r.getSlot().getId() : null)
                .reservationDate(r.getReservationDate())
                .reservationTime(r.getReservationTime())
                .customerId(r.getCustomer().getId())
                .partySize(r.getPartySize())
                .status(r.getStatus().name())
                .createdAt(r.getCreatedAt())
                .entryStatus(r.getEntryStatus().name())
                .qrToken(r.getQrToken())
                .build();
    }
}