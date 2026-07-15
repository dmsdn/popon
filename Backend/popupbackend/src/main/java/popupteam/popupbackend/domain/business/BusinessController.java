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
        return ResponseEntity.status(201).body(business);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody BusinessLoginRequest request) {
        return ResponseEntity.ok(businessService.login(request));
    }
}