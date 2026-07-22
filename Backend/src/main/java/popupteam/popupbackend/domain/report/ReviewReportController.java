package popupteam.popupbackend.domain.report;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.report.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReviewReportController {

    private final ReviewReportService reviewReportService;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 참가자: 신고 접수
    @PostMapping("/api/reports")
    public ResponseEntity<?> create(@RequestParam Long customerId,
                                    @Valid @RequestBody ReportCreateRequest request) {
        return ResponseEntity.status(201).body(reviewReportService.create(customerId, request));
    }

    // 관리자: 전체 신고 목록 (?status=PENDING 필터 가능)
    @GetMapping("/api/admin/reports")
    public ResponseEntity<List<ReportResponse>> getAll(
            Authentication authentication,
            @RequestParam(required = false) ReportStatus status) {
        requireAdmin(authentication);
        return ResponseEntity.ok(reviewReportService.getAll(status));
    }

    // 관리자: 신고 처리완료 처리
    @PatchMapping("/api/admin/reports/{id}/process")
    public ResponseEntity<?> process(@PathVariable Long id, Authentication authentication) {
        requireAdmin(authentication);
        return ResponseEntity.ok(reviewReportService.process(id, authentication.getName()));
    }
}