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
@RequiredArgsConstructor
public class PopupSlotController {

    private final PopupSlotService popupSlotService;
    private final BusinessRepository businessRepository;

    @PostMapping("/api/popups/{popupId}/slots")
    public ResponseEntity<?> create(@PathVariable Long popupId,
                                    Authentication authentication,
                                    @Valid @RequestBody PopupSlotCreateRequest request) {
        Business business = businessRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
        return ResponseEntity.status(201).body(popupSlotService.create(popupId, business.getId(), request));
    }

    @PostMapping("/api/popups/{popupId}/slots/generate")
    public ResponseEntity<?> generate(@PathVariable Long popupId,
                                      Authentication authentication,
                                      @RequestBody(required = false) SlotGenerateRequest request) {
        Business business = businessRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
        return ResponseEntity.ok(popupSlotService.generate(popupId, business.getId(), request));
    }

    @GetMapping("/api/popups/{popupId}/slots")
    public ResponseEntity<List<PopupSlotResponse>> findByPopup(@PathVariable Long popupId) {
        return ResponseEntity.ok(popupSlotService.findByPopup(popupId));
    }
}