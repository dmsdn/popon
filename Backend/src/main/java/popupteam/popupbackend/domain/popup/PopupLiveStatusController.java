package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.PopupLiveStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class PopupLiveStatusController {

    private final PopupLiveStatusService popupLiveStatusService;

    @GetMapping("/api/popups/{popupId}/live-status")
    public ResponseEntity<PopupLiveStatusResponse> getLiveStatus(@PathVariable Long popupId) {
        return ResponseEntity.ok(popupLiveStatusService.getLiveStatus(popupId));
    }
}