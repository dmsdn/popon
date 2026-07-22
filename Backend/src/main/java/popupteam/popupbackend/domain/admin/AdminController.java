package popupteam.popupbackend.domain.admin;

import popupteam.popupbackend.domain.admin.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(adminService.login(request));
    }

    // signup 엔드포인트는 제거함 - 관리자 계정은 API로 발급하지 않음
}