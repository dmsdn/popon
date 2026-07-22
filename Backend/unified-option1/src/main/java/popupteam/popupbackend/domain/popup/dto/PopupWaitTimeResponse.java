package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.time.LocalDate;

@Getter @Builder
public class PopupWaitTimeResponse {
    private Long popupId;
    private LocalDate date;
    private Integer reservedCount;
    private Integer capacity;
    private Double estimatedWaitMinutes;
}