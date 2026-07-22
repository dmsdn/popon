package popupteam.popupbackend.domain.venue;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.venue.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class VenueMeetingController {

    private final VenueMeetingService venueMeetingService;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 주최자: 미팅 신청
    @PostMapping("/api/venues/{venueId}/meeting-requests")
    public ResponseEntity<?> create(@PathVariable Long venueId,
                                    Authentication authentication,
                                    @RequestBody(required = false) VenueMeetingCreateRequest request) {
        VenueMeetingCreateRequest req = (request != null) ? request : new VenueMeetingCreateRequest();
        return ResponseEntity.status(201).body(
                venueMeetingService.create(venueId, authentication.getName(), req));
    }

    // 주최자: 본인 신청 목록
    @GetMapping("/api/venues/meeting-requests/my")
    public ResponseEntity<List<VenueMeetingResponse>> getMyRequests(Authentication authentication) {
        return ResponseEntity.ok(venueMeetingService.getMyRequests(authentication.getName()));
    }

    // 관리자: 전체 목록 (?status=REQUESTED 필터 가능)
    @GetMapping("/api/admin/venues/meeting-requests")
    public ResponseEntity<List<VenueMeetingResponse>> getAll(
            Authentication authentication,
            @RequestParam(required = false) VenueMeetingStatus status) {
        requireAdmin(authentication);
        return ResponseEntity.ok(venueMeetingService.getAll(status));
    }

    // 관리자: 상태 변경
    @PatchMapping("/api/admin/venues/meeting-requests/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          Authentication authentication,
                                          @Valid @RequestBody VenueMeetingStatusUpdateRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(venueMeetingService.updateStatus(id, request));
    }
}