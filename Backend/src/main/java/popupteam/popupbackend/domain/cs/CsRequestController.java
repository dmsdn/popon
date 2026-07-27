package popupteam.popupbackend.domain.cs;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.cs.dto.*;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class CsRequestController {

    private final CsRequestService csRequestService;
    private final JwtUtil jwtUtil;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }

    // 참가자: CS 작성 (본인 인증 토큰에서 customerId 추출, 위조 불가)
    @PostMapping("/api/cs")
    public ResponseEntity<?> create(@RequestHeader("Authorization") String authHeader,
                                    @Valid @RequestBody CsCreateRequest request) {
        Long customerId = extractCustomerId(authHeader);
        return ResponseEntity.status(201).body(csRequestService.create(customerId, request));
    }

    // 참가자: 본인 CS 목록 (본인 인증 토큰에서 customerId 추출)
    @GetMapping("/api/cs/me")
    public ResponseEntity<List<CsResponse>> getMyRequests(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);
        return ResponseEntity.ok(csRequestService.getMyRequests(customerId));
    }

    // 관리자: 전체 CS 목록 (?status=PENDING 필터 가능)
    @GetMapping("/api/admin/cs")
    public ResponseEntity<List<CsResponse>> getAllRequests(
            Authentication authentication,
            @RequestParam(required = false) CsStatus status) {
        requireAdmin(authentication);
        return ResponseEntity.ok(csRequestService.getAllRequests(status));
    }

    // 관리자: 답변 등록
    @PatchMapping("/api/admin/cs/{id}/answer")
    public ResponseEntity<?> answer(@PathVariable Long id,
                                    Authentication authentication,
                                    @Valid @RequestBody CsAnswerRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(csRequestService.answer(id, authentication.getName(), request));
    }
}