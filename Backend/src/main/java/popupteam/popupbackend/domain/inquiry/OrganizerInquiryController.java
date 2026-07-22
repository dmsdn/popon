package popupteam.popupbackend.domain.inquiry;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.inquiry.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class OrganizerInquiryController {

    private final OrganizerInquiryService organizerInquiryService;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 주최자: 문의 작성
    @PostMapping("/api/inquiries")
    public ResponseEntity<?> create(Authentication authentication,
                                    @Valid @RequestBody InquiryCreateRequest request) {
        return ResponseEntity.status(201).body(
                organizerInquiryService.create(authentication.getName(), request));
    }

    // 주최자: 본인 문의 목록
    @GetMapping("/api/inquiries/my")
    public ResponseEntity<List<InquiryResponse>> getMyInquiries(Authentication authentication) {
        return ResponseEntity.ok(organizerInquiryService.getMyInquiries(authentication.getName()));
    }

    // 관리자: 전체 문의 목록 (?status=PENDING 필터 가능)
    @GetMapping("/api/admin/inquiries")
    public ResponseEntity<List<InquiryResponse>> getAllInquiries(
            Authentication authentication,
            @RequestParam(required = false) InquiryStatus status) {
        requireAdmin(authentication);
        return ResponseEntity.ok(organizerInquiryService.getAllInquiries(status));
    }

    // 관리자: 답변 등록
    @PatchMapping("/api/admin/inquiries/{id}/answer")
    public ResponseEntity<?> answer(@PathVariable Long id,
                                    Authentication authentication,
                                    @Valid @RequestBody InquiryAnswerRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(organizerInquiryService.answer(id, authentication.getName(), request));
    }
}