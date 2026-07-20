package popupteam.popupbackend.domain.reservation.dto;

import lombok.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import java.time.LocalDateTime;

@Getter @Builder
public class ReservationResponse {
    private Long id;
    private Long slotId;
    private Long customerId;
    private Integer partySize;
    private LocalDateTime createdAt;

    public static ReservationResponse from(Reservation r) {
        return ReservationResponse.builder()
                .id(r.getId())
                .slotId(r.getSlot().getId())
                .customerId(r.getCustomer().getId())
                .partySize(r.getPartySize())
                .createdAt(r.getCreatedAt())
                .build();
    }
}