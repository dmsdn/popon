package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.UnifiedQueueBoardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class UnifiedQueueController {

    private final UnifiedQueueService unifiedQueueService;

    // 통합 대기열 현황판 (사전예약자 + 현장웨이팅자)
    @GetMapping("/api/popups/{popupId}/queue/board")
    public ResponseEntity<UnifiedQueueBoardResponse> getBoard(@PathVariable Long popupId) {
        return ResponseEntity.ok(unifiedQueueService.getBoard(popupId));
    }

    // 통합 QR 체크인 (예약이든 현장웨이팅이든 하나의 엔드포인트로 처리)
    @PostMapping("/api/queue/checkin/qr")
    public ResponseEntity<?> checkinByQr(org.springframework.security.core.Authentication authentication,
                                         @RequestBody java.util.Map<String, String> body) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        String qrToken = body.get("qrToken");
        return ResponseEntity.ok(unifiedQueueService.checkinByQr(qrToken, name, isAdmin));
    }

    // 통합 QR 퇴장 처리 (예약이든 현장웨이팅이든 하나의 엔드포인트로 처리)
    @PostMapping("/api/queue/exit/qr")
    public ResponseEntity<?> exitByQr(org.springframework.security.core.Authentication authentication,
                                      @RequestBody java.util.Map<String, String> body) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        String qrToken = body.get("qrToken");
        return ResponseEntity.ok(unifiedQueueService.exitByQr(qrToken, name, isAdmin));
    }

}