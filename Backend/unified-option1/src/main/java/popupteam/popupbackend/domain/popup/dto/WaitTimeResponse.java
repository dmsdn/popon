package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.util.List;

@Getter @Builder
public class WaitTimeResponse {
    private Long popupId;
    private String reservationMode; // "SLOT" 또는 "FREE"
    private List<SlotWaitTimeResponse> slots;      // SLOT 모드일 때만 값 있음
    private PopupWaitTimeResponse freeModeResult;   // FREE 모드일 때만 값 있음
}