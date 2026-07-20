package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.popup.dto.AdminDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/api/admin/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard(Authentication authentication) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        if (!isAdmin) {
            throw new ForbiddenException("관리자만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(adminDashboardService.getSummary());
    }
}