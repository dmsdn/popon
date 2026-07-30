package popupteam.popupbackend.domain.popup.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.PopupOperatingHours;
import java.time.LocalTime;

@Getter
@Builder
public class OperatingHoursResponse {
    private String dayOfWeek;
    private LocalTime openTime;
    private LocalTime closeTime;
    private boolean closed;

    public static OperatingHoursResponse from(PopupOperatingHours h) {
        return OperatingHoursResponse.builder()
                .dayOfWeek(h.getDayOfWeek().name())
                .openTime(h.getOpenTime())
                .closeTime(h.getCloseTime())
                .closed(h.isClosed())
                .build();
    }
}