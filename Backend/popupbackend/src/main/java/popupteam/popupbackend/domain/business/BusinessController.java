package popupteam.popupbackend.domain.business;

import popupteam.popupbackend.domain.business.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/business/auth")
@RequiredArgsConstructor
public class BusinessController {

    private final BusinessService businessService;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody BusinessSignupRequest request) {
        Business business = businessService.signup(request);
        return ResponseEntity.status(201).body(BusinessInfoResponse.from(business));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody BusinessLoginRequest request) {
        return ResponseEntity.ok(businessService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMyInfo(org.springframework.security.core.Authentication authentication) {
        Business business = businessService.findByEmail(authentication.getName());
        return ResponseEntity.ok(BusinessInfoResponse.from(business));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMyInfo(org.springframework.security.core.Authentication authentication,
                                          @RequestBody BusinessUpdateRequest request) {
        Business business = businessService.updateInfo(authentication.getName(), request);
        return ResponseEntity.ok(BusinessInfoResponse.from(business));
    }

    @PutMapping("/me/password")
    public ResponseEntity<?> changePassword(org.springframework.security.core.Authentication authentication,
                                            @Valid @RequestBody PasswordChangeRequest request) {
        businessService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(java.util.Map.of("message", "비밀번호가 변경되었습니다."));
    }
}