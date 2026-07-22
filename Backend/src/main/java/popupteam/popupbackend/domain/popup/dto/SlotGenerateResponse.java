package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.util.List;

@Getter @Builder
public class SlotGenerateResponse {
    private int created;
    private int deletedStale;
    private int keptStale;
    private List<PopupSlotResponse> slots;
}