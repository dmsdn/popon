package popupteam.popupbackend.domain.popup.dto;

import lombok.*;

@Getter @Builder
public class PopupLiveStatusResponse {
    private Long popupId;
    private Integer capacity;
    private Integer currentOccupancy; // 추정 현재 인원
    private Double congestionRate;    // 0.0 ~ 1.0+
    private String congestionLabel;   // "여유" / "보통" / "혼잡"
}