package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
public class PopupSlotCreateRequest {
    @NotNull
    private LocalDate slotDate;
    @NotNull
    private LocalTime startTime;
    @NotNull
    private LocalTime endTime;
    @NotNull @Min(1)
    private Integer capacity;
}