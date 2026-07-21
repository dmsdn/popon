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
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        // 주최자/관리자 둘 다 허용 (본인 팝업 여부는 추후 세밀화 가능, 지금은 인증만 확인)
        if (name == null) {
            throw new ForbiddenException("권한이 없습니다.");
        }
    }

    // 키오스크/패드: 대기 등록 (인증 불필요, 현장 기기용)
    @PostMapping("/api/popups/{popupId}/waiting")
    public ResponseEntity<?> register(@PathVariable Long popupId,
                                      @Valid @RequestBody WaitingCreateRequest request) {
        return ResponseEntity.status(201).body(waitingQueueService.register(popupId, request));
    }

    // 패드 현황판: 대기 목록 (인증 불필요, 현장 기기용, 폴링으로 조회)
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

    // 주최자/관리자: 입장 확인
    @PatchMapping("/api/waiting/{id}/enter")
    public ResponseEntity<?> enter(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.enter(id));
    }

    // 주최자/관리자: 수동 취소
    @PatchMapping("/api/waiting/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication authentication) {
        requireStaff(authentication);
        return ResponseEntity.ok(waitingQueueService.cancel(id));
    }
}