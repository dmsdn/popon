package popupteam.popupbackend.domain.waiting;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.waiting.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class WaitingQueueController {

    private final WaitingQueueService waitingQueueService;

    private void requireStaff(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new ForbiddenException("권한이 없습니다.");
        }
    }

    // 현장 웨이팅 등록
    // - 회원: customerId 쿼리파라미터로 전달 (customerfrontend에서 로그인 상태로 호출)
    // - 비회원: customerId 없이, body에 name+email 채워서 호출 (QR폼에서 호출)
    @PostMapping("/api/popups/{popupId}/waiting")
    public ResponseEntity<?> register(@PathVariable Long popupId,
                                      @RequestParam(required = false) Long customerId,
                                      @Valid @RequestBody WaitingCreateRequest request) {
        return ResponseEntity.status(201).body(waitingQueueService.register(popupId, customerId, request));
    }

    // 패드 현황판: 현장웨이팅만 (단순 버전, 통합 버전은 별도 API)
    @GetMapping("/api/popups/{popupId}/waiting/board")
    public ResponseEntity<WaitingBoardResponse> getBoard(@PathVariable Long popupId) {
        return ResponseEntity.ok(waitingQueueService.getBoard(popupId));
    }

    // 개별 대기 상태 확인 (본인 대기번호로)
    @GetMapping("/api/waiting/{id}")
    public ResponseEntity<WaitingResponse> getMyStatus(@PathVariable Long id) {
        return ResponseEntity.ok(waitingQueueService.getMyStatus(id));
    }

    // 주최자/관리자: 호출
    @PatchMapping("/api/waiting/{id}/call")
    public ResponseEntity<?> call(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.call(id));
    }

    // 주최자/관리자: 수동 입장 확인 (버튼으로)
    @PatchMapping("/api/waiting/{id}/enter")
    public ResponseEntity<?> enter(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.enter(id));
    }

    // 주최자/관리자: QR 스캔 입장확인 (현장웨이팅 QR 전용)
    // popupId는 지금 스캔 중인 화면(현장)이 속한 팝업 ID - 프론트가 반드시 함께 전달해야 함
    // (QR 토큰이 유효해도 스캔 중인 팝업과 QR의 팝업이 다르면 거부하기 위한 필수 검증값)
    @PostMapping("/api/waiting/checkin/qr")
    public ResponseEntity<?> checkinByQr(Authentication authentication,
                                         @RequestBody java.util.Map<String, String> body) {
        requireStaff(authentication);
        String qrToken = body.get("qrToken");
        Long popupId = Long.valueOf(body.get("popupId"));
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(waitingQueueService.enterByQr(qrToken, popupId, name, isAdmin));
    }

    // 주최자/관리자: 수동 취소 (customerId 넘기면 소비자 본인취소 경로로 대신 처리)
    @PatchMapping("/api/waiting/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                    @RequestParam(required = false) Long customerId,
                                    Authentication authentication) {
        if (customerId != null) {
            return ResponseEntity.ok(waitingQueueService.cancelByCustomer(id, customerId));
        }
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.cancel(id));
    }

    @GetMapping("/api/waiting/me")
    public ResponseEntity<?> getMyWaitings(@RequestParam Long customerId) {
        return ResponseEntity.ok(waitingQueueService.getMyActiveWaitings(customerId));
    }
}