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

    // QR 토큰으로 내 대기 상태 확인 (7/31 신설, 로그인 불필요)
    //
    // 손님이 문자로 받은 링크(/qr/{token})를 열면 그 화면이 이걸 주기적으로 물어본다.
    // 그전에는 손님 화면이 QR만 띄우고 멈춰 있어서, 직원이 스캔해 입장 처리를 해도
    // **손님 쪽에는 아무 변화가 없었다.** 입장이 됐는지 손님이 알 방법이 없었다.
    //
    // 비회원 웨이팅(이름·연락처만 남기고 접수)도 써야 하므로 인증을 걸지 않는다.
    // 대신 **토큰을 아는 사람에게도 개인정보를 주지 않는다** — 응답에서 이름·연락처·이메일을 뺀다.
    // 토큰은 문자로 전달되므로 유출 가능성이 있고, 이 화면에 필요한 것은 상태와 순번뿐이다.
    @GetMapping("/api/waiting/qr/{qrToken}")
    public ResponseEntity<WaitingQrStatusResponse> getStatusByQr(@PathVariable String qrToken) {
        return ResponseEntity.ok(waitingQueueService.getStatusByQr(qrToken));
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
    @PostMapping("/api/waiting/checkin/qr")
    public ResponseEntity<?> checkinByQr(Authentication authentication,
                                         @RequestBody java.util.Map<String, String> body) {
        requireStaff(authentication);
        String qrToken = body.get("qrToken");
        return ResponseEntity.ok(waitingQueueService.enterByQr(qrToken));
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