package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.notice.dto.AdminNoticeToBusinessRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/notices")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final NoticeService noticeService;

    private void checkAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    @PostMapping("/business")
    public ResponseEntity<?> sendToBusiness(Authentication authentication,
                                            @Valid @RequestBody AdminNoticeToBusinessRequest request) {
        checkAdmin(authentication);
        var response = noticeService.sendToBusiness(request.getBusinessId(), request.getPopupId(),
                request.getTitle(), request.getContent(), authentication.getName());
        return ResponseEntity.status(201).body(response);
    }
}