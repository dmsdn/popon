package popupteam.popupbackend.domain.popup.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalTime;

@Getter
@Setter
public class OperatingHoursRequest {
    private String dayOfWeek; // "MONDAY".."SUNDAY" (java.time.DayOfWeek 이름 그대로)
    private LocalTime openTime;  // 휴무면 null 가능
    private LocalTime closeTime; // 휴무면 null 가능
    private boolean closed;
}