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
    // date를 주면 그날의 명단, 없으면 오늘 (8/4 — 하루 단위로 끊어 지난 날짜 기록도 조회 가능)
    @GetMapping("/api/popups/{popupId}/queue/board")
    public ResponseEntity<UnifiedQueueBoardResponse> getBoard(
            @PathVariable Long popupId,
            @RequestParam(required = false)
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            java.time.LocalDate date) {
        return ResponseEntity.ok(unifiedQueueService.getBoard(popupId, date));
    }

    // 통합 QR 체크인 (예약이든 현장웨이팅이든 하나의 엔드포인트로 처리)
    //
    // 7/31 — body에 popupId가 추가됐다. 그전에는 qrToken만 받고 「이 QR이 내 팝업 것인가」만
    // 확인했기 때문에, 팝업을 여러 개 운영하는 주최자는 **지금 보고 있는 팝업이 아닌 다른 내 팝업의
    // QR도 여기서 입장 처리해 버릴 수 있었다.** 서비스가 popupId까지 대조하게 바꿨다.
    // popupId가 없는 옛 클라이언트는 종전대로 동작한다(null 허용) — 배포 시차를 견디기 위함.
    @PostMapping("/api/queue/checkin/qr")
    public ResponseEntity<?> checkinByQr(org.springframework.security.core.Authentication authentication,
                                         @RequestBody java.util.Map<String, Object> body) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        String qrToken = str(body.get("qrToken"));
        return ResponseEntity.ok(unifiedQueueService.checkinByQr(qrToken, popupId(body), name, isAdmin));
    }

    // 통합 QR 퇴장 처리 (예약이든 현장웨이팅이든 하나의 엔드포인트로 처리)
    @PostMapping("/api/queue/exit/qr")
    public ResponseEntity<?> exitByQr(org.springframework.security.core.Authentication authentication,
                                      @RequestBody java.util.Map<String, Object> body) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        String qrToken = str(body.get("qrToken"));
        return ResponseEntity.ok(unifiedQueueService.exitByQr(qrToken, popupId(body), name, isAdmin));
    }

    private static String str(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    // popupId는 JSON에서 숫자로도 문자열로도 올 수 있어 둘 다 받는다. 없거나 형식이 이상하면 null(=검사 생략).
    private static Long popupId(java.util.Map<String, Object> body) {
        Object v = body.get("popupId");
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

}