package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.popup.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/popups")
@RequiredArgsConstructor
public class PopupController {

    private final PopupService popupService;
    private final BusinessRepository businessRepository;

    private Long getBusinessId(Authentication authentication) {
        String email = authentication.getName();
        Business business = businessRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
        return business.getId();
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication,
                                    @Valid @RequestBody PopupCreateRequest request) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.status(201).body(popupService.create(businessId, request));
    }

    @GetMapping
    public ResponseEntity<List<PopupResponse>> findAll() {
        return ResponseEntity.ok(popupService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PopupResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(popupService.findById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestBody PopupUpdateRequest request) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.ok(popupService.update(id, businessId, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        popupService.delete(id, businessId);
        return ResponseEntity.noContent().build();
    }
}