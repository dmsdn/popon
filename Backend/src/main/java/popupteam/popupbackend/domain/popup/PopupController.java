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
    private final PopupPopularityService popupPopularityService;

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
    public ResponseEntity<List<PopupResponse>> search(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(popupService.search(location, status, keyword));
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

    @PostMapping("/{id}/images")
    public ResponseEntity<?> uploadImage(@PathVariable Long id,
                                         Authentication authentication,
                                         @org.springframework.web.bind.annotation.RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        Long businessId = getBusinessId(authentication);
        String imageUrl = popupService.uploadImage(id, businessId, file);
        return ResponseEntity.ok(java.util.Map.of("imageUrl", imageUrl));
    }

    @GetMapping("/my")
    public ResponseEntity<List<PopupResponse>> getMyPopups(Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        return ResponseEntity.ok(popupService.getMyPopups(businessId));
    }

    // 팝업 상세페이지 진입 시 클릭 로그 기록 (회원/비회원 둘 다 가능)
    @PostMapping("/{id}/click")
    public ResponseEntity<?> logClick(@PathVariable Long id, @RequestParam(required = false) Long customerId) {
        popupPopularityService.logClick(id, customerId);
        return ResponseEntity.ok().build();
    }

    // 인기 추천 팝업 (찜+후기+클릭수 합산 랭킹)
    @GetMapping("/popular")
    public ResponseEntity<?> getPopularPopups(@RequestParam(defaultValue = "10") int limit,
                                              @RequestParam(required = false) String region) {
        return ResponseEntity.ok(popupPopularityService.getPopularPopups(limit, region));
    }

    // 곧 오픈하는 팝업 (홈 화면 "곧 오픈하는 팝업 추천 카드"용)
    @GetMapping("/upcoming")
    public ResponseEntity<?> getUpcomingPopups(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(popupService.getUpcomingPopups(limit));
    }
}