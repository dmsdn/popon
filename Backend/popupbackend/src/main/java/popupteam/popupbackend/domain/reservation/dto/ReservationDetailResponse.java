package popupteam.popupbackend.domain.reservation.dto;

import lombok.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter @Builder
public class ReservationDetailResponse {
    private Long id;
    private Long slotId;
    private LocalDate slotDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Long customerId;
    private String customerNickname;
    private Integer partySize;
    private LocalDateTime createdAt;

    public static ReservationDetailResponse from(Reservation r) {
        return ReservationDetailResponse.builder()
                .id(r.getId())
                .slotId(r.getSlot().getId())
                .slotDate(r.getSlot().getSlotDate())
                .startTime(r.getSlot().getStartTime())
                .endTime(r.getSlot().getEndTime())
                .customerId(r.getCustomer().getId())
                .customerNickname(r.getCustomer().getNickname())
                .partySize(r.getPartySize())
                .createdAt(r.getCreatedAt())
                .build();
    }
}