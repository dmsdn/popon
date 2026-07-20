package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.WaitTimeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/popups")
@RequiredArgsConstructor
public class PopupWaitTimeController {

    private final PopupWaitTimeService popupWaitTimeService;

    @GetMapping("/{popupId}/wait-time")
    public ResponseEntity<WaitTimeResponse> getWaitTime(
            @PathVariable Long popupId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(popupWaitTimeService.calculate(popupId, date));
    }
}