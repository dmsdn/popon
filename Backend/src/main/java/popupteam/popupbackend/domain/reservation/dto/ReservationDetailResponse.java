package popupteam.popupbackend.domain.reservation.dto;

import lombok.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Builder
public class ReservationDetailResponse {
    private Long id;
    private Long popupId;
    private Long slotId; // FREE 모드면 null
    private LocalDate reservationDate;
    private LocalTime startTime; // FREE 모드면 null
    private LocalTime endTime;   // FREE 모드면 null
    private Long customerId;
    private String customerNickname;
    private Integer partySize;
    private String status;
    private String cancelReason;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
    private String entryStatus;
    private LocalDateTime checkedInAt;
    private String checkedInBy;
    private LocalTime reservationTime;

    public static ReservationDetailResponse from(Reservation r) {
        boolean hasSlot = r.getSlot() != null;
        return ReservationDetailResponse.builder()
                .id(r.getId())
                .popupId(r.getPopup().getId())
                .slotId(hasSlot ? r.getSlot().getId() : null)
                .reservationDate(r.getReservationDate())
                .startTime(hasSlot ? r.getSlot().getStartTime() : null)
                .endTime(hasSlot ? r.getSlot().getEndTime() : null)
                .customerId(r.getCustomer().getId())
                .customerNickname(r.getCustomer().getNickname())
                .partySize(r.getPartySize())
                .status(r.getStatus().name())
                .cancelReason(r.getCancelReason())
                .cancelledAt(r.getCancelledAt())
                .createdAt(r.getCreatedAt())
                .entryStatus(r.getEntryStatus().name())
                .checkedInAt(r.getCheckedInAt())
                .checkedInBy(r.getCheckedInBy())
                .reservationTime(r.getReservationTime())
                .build();
    }
}