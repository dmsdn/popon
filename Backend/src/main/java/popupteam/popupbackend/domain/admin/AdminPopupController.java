package popupteam.popupbackend.domain.admin;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.popup.PopupService;
import popupteam.popupbackend.domain.popup.dto.PopupRejectRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/popups")
@RequiredArgsConstructor
public class AdminPopupController {

    private final PopupService popupService;

    private void checkAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        return ResponseEntity.ok(popupService.approve(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestBody PopupRejectRequest request) {
        checkAdmin(authentication);
        return ResponseEntity.ok(popupService.reject(id, request.getReason()));
    }

    @PutMapping("/{id}/suspend")
    public ResponseEntity<?> suspend(@PathVariable Long id,
                                     Authentication authentication,
                                     @RequestBody PopupRejectRequest request) {
        checkAdmin(authentication);
        return ResponseEntity.ok(popupService.suspend(id, request.getReason()));
    }

    @PutMapping("/{id}/resume")
    public ResponseEntity<?> resume(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        return ResponseEntity.ok(popupService.resume(id));
    }
}