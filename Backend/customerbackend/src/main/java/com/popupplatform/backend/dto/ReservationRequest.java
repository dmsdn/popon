package com.popupplatform.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReservationRequest {
    private Long slotId;
    private Integer partySize;
}