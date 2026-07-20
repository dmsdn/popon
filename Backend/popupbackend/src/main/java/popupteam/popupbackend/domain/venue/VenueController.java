package popupteam.popupbackend.domain.venue;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.venue.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class VenueController {

    private final VenueService venueService;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 관리자: 등록
    @PostMapping("/api/admin/venues")
    public ResponseEntity<?> create(Authentication authentication,
                                    @Valid @RequestBody VenueCreateRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.status(201).body(venueService.create(request));
    }

    // 관리자: 수정
    @PutMapping("/api/admin/venues/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestBody VenueUpdateRequest request) {
        requireAdmin(authentication);
        return ResponseEntity.ok(venueService.update(id, request));
    }

    // 관리자: 삭제
    @DeleteMapping("/api/admin/venues/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        requireAdmin(authentication);
        venueService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // 공개: 목록 조회 (?status=AVAILABLE 필터 가능)
    @GetMapping("/api/venues")
    public ResponseEntity<List<VenueResponse>> getAll(@RequestParam(required = false) VenueStatus status) {
        return ResponseEntity.ok(venueService.getAll(status));
    }

    // 공개: 상세 조회
    @GetMapping("/api/venues/{id}")
    public ResponseEntity<VenueResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(venueService.getById(id));
    }
}