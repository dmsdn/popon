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

    // QR 토큰으로 상태 조회 (7/31 신설 → 8/4 머지 유실 → 복구).
    // 손님의 /qr/{token} 화면이 3초 폴링한다. 소비자 앱과 SecurityConfig permitAll 규칙은
    // 계속 이 경로를 보고 있었는데 핸들러만 사라져 QR 화면의 상태 갱신이 통째로 죽어 있었다.
    // 비회원 웨이팅도 써야 하므로 인증을 걸지 않는다. 대신 **토큰을 아는 사람에게도
    // 개인정보를 주지 않는다** — 응답(WaitingQrStatusResponse)에서 이름·연락처·이메일을 뺀다.
    @GetMapping("/api/waiting/qr/{qrToken}")
    public ResponseEntity<WaitingQrStatusResponse> getStatusByQr(@PathVariable String qrToken) {
        return ResponseEntity.ok(waitingQueueService.getStatusByQr(qrToken));
    }

    // 주최자/관리자: 호출 — 부활 (8/4 저녁).
    //
    // 오전에 「호출 기능 폐지」 판단으로 잠시 닫았다가, 호출 시 이메일·SMS·인앱 알림을 보내는
    // 구현(WaitingQueueService.call의 알림 #5)이 들어오면서 되살렸다. 닫아 둔 채로는 그 알림이
    // 영영 발송되지 않는 죽은 코드였다.
    //
    // 닫았던 이유였던 「CALLED 건이 자정 리셋에서 빠진다」는 문제는 리셋 대상에 CALLED를
    // 함께 넣어 해소했다(DailyQueueResetScheduler). 다만 호출 후 15분이 지나도 자동 취소되지는
    // 않는다 — 그 스케줄러는 폐지됐고, 정리는 하루 단위 리셋이 맡는다.
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

    // 주최자/관리자: 노쇼 처리 (8/4 신설) — 예약의 PATCH /api/reservations/{id}/no-show와 대칭.
    // 그전에는 웨이팅에 노쇼 상태가 없어 관제 화면이 취소 API로 대신 처리했는데,
    // 그러면 손님 본인 취소와 구분이 안 돼 노쇼율을 집계할 수 없었다.
    @PatchMapping("/api/waiting/{id}/no-show")
    public ResponseEntity<?> noShow(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.noShow(id));
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