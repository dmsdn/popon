package com.popupplatform.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReservationUpdateRequest {
    private String visitDate;  // "2026-07-20"
    private String visitTime;  // "14:00"
    private Integer partySize;
}