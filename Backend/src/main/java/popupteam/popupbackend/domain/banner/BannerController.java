package popupteam.popupbackend.domain.banner;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.banner.dto.BannerFromPopupRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    private void checkAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    @PostMapping("/api/admin/banners")
    public ResponseEntity<?> create(Authentication authentication,
                                    @RequestParam("file") MultipartFile file,
                                    @RequestParam String title,
                                    @RequestParam(required = false) String linkUrl,
                                    @RequestParam(required = false) Integer sortOrder,
                                    @RequestParam(required = false)
                                    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                    LocalDateTime startDate,
                                    @RequestParam(required = false)
                                    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                    LocalDateTime endDate) {
        checkAdmin(authentication);
        return ResponseEntity.status(201)
                .body(bannerService.create(title, linkUrl, sortOrder, startDate, endDate, file));
    }

    @PutMapping("/api/admin/banners/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestParam(required = false) MultipartFile file,
                                    @RequestParam(required = false) String title,
                                    @RequestParam(required = false) String linkUrl,
                                    @RequestParam(required = false) Integer sortOrder,
                                    @RequestParam(required = false)
                                    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                    LocalDateTime startDate,
                                    @RequestParam(required = false)
                                    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
                                    LocalDateTime endDate,
                                    @RequestParam(required = false) Boolean active) {
        checkAdmin(authentication);
        return ResponseEntity.ok(bannerService.update(id, title, linkUrl, sortOrder, startDate, endDate, active, file));
    }

    // 배너로 등록할 수 있는 팝업 후보 목록 (진행중 + 오픈예정만)
    @GetMapping("/api/admin/banners/eligible-popups")
    public ResponseEntity<?> getEligiblePopups(Authentication authentication) {
        checkAdmin(authentication);
        return ResponseEntity.ok(bannerService.getEligiblePopups());
    }

    // 진행중/오픈예정 팝업 목록에서 관리자가 고른 팝업으로 배너 생성
    @PostMapping("/api/admin/banners/from-popup")
    public ResponseEntity<?> createFromPopup(Authentication authentication,
                                             @Valid @RequestBody BannerFromPopupRequest request) {
        checkAdmin(authentication);
        return ResponseEntity.status(201)
                .body(bannerService.createFromPopup(request.getPopupId(), request.getTitle(), request.getSortOrder()));
    }

    // 배너 노출 순서 일괄 변경
    @PatchMapping("/api/admin/banners/reorder")
    public ResponseEntity<?> reorder(Authentication authentication, @RequestBody List<Long> bannerIds) {
        checkAdmin(authentication);
        return ResponseEntity.ok(bannerService.reorder(bannerIds));
    }

    @DeleteMapping("/api/admin/banners/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        bannerService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/admin/banners")
    public ResponseEntity<?> getAll(Authentication authentication) {
        checkAdmin(authentication);
        return ResponseEntity.ok(bannerService.getAll());
    }

    @GetMapping("/api/banners")
    public ResponseEntity<?> getActiveBanners() {
        return ResponseEntity.ok(bannerService.getActiveBanners());
    }
}