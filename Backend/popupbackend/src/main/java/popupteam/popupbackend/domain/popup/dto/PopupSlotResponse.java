package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import popupteam.popupbackend.domain.popup.PopupSlot;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Builder
public class PopupSlotResponse {
    private Long id;
    private Long popupId;
    private LocalDate slotDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer capacity;
    private Integer reservedCount;
    private Integer remaining;

    public static PopupSlotResponse from(PopupSlot slot, int reservedCount) {
        return PopupSlotResponse.builder()
                .id(slot.getId())
                .popupId(slot.getPopup().getId())
                .slotDate(slot.getSlotDate())
                .startTime(slot.getStartTime())
                .endTime(slot.getEndTime())
                .capacity(slot.getCapacity())
                .reservedCount(reservedCount)
                .remaining(slot.getCapacity() - reservedCount)
                .build();
    }
}