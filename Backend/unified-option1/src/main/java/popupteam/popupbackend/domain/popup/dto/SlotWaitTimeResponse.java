package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Builder
public class SlotWaitTimeResponse {
    private Long slotId;
    private LocalDate slotDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer reservedCount;
    private Integer capacity;
    private Double estimatedWaitMinutes;
}