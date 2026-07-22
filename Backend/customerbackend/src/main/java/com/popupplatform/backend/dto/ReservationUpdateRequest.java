package com.popupplatform.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReservationUpdateRequest {
    private Long slotId;      // 다른 시간대로 변경
    private Integer partySize;
}