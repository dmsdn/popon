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
    private final popupteam.popupbackend.domain.reservation.PopupVisitorAgeStatsService popupVisitorAgeStatsService;
    private final PopupImageRepository popupImageRepository;

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

    // 팝업 이미지 목록 조회 - 로그인 여부 무관, 누구나 조회 가능
    @GetMapping("/{id}/images")
    public ResponseEntity<List<java.util.Map<String, Object>>> getImages(@PathVariable Long id) {
        List<java.util.Map<String, Object>> images = popupImageRepository.findByPopupIdOrderBySortOrder(id).stream()
                .map(img -> java.util.Map.<String, Object>of("id", img.getId(), "imageUrl", img.getImageUrl()))
                .toList();
        return ResponseEntity.ok(images);
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

    // 방문객(체크인 완료자) 연령 분포 - 본인 팝업만 조회 가능
    @GetMapping("/{id}/visitor-age-stats")
    public ResponseEntity<java.util.Map<String, Long>> getVisitorAgeStats(
            @PathVariable Long id, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getAgeDistribution(id));
    }

    // 방문객(체크인 완료자) 성별 분포 - 본인 팝업만 조회 가능
    @GetMapping("/{id}/visitor-gender-stats")
    public ResponseEntity<java.util.Map<String, Long>> getVisitorGenderStats(
            @PathVariable Long id, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getGenderDistribution(id));
    }

    // 일별 방문자 수 추이 (기본 최근 7일) - 본인 팝업만 조회 가능
    @GetMapping("/{id}/visitor-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getVisitorTrend(
            @PathVariable Long id,
            @RequestParam(defaultValue = "7") int days,
            Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getDailyVisitorTrend(id, days));
    }

    // 누적 방문자 + 일평균 방문자 - 본인 팝업만 조회 가능
    @GetMapping("/{id}/visitor-summary")
    public ResponseEntity<java.util.Map<String, Object>> getVisitorSummary(
            @PathVariable Long id, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getTotalVisitorStats(id));
    }

    // 일별 예약 건수 (기본 최근 7일, 취소 제외) - 본인 팝업만 조회 가능
    @GetMapping("/{id}/reservation-trend")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> getReservationTrend(
            @PathVariable Long id,
            @RequestParam(defaultValue = "7") int days,
            Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getDailyReservationTrend(id, days));
    }

    // 예약 전환율(클릭 대비 예약률) - 본인 팝업만 조회 가능
    @GetMapping("/{id}/conversion-rate")
    public ResponseEntity<java.util.Map<String, Object>> getConversionRate(
            @PathVariable Long id, Authentication authentication) {
        Long businessId = getBusinessId(authentication);
        PopupResponse popup = popupService.findById(id);
        if (!popup.getBusinessId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업만 조회할 수 있습니다.");
        }
        return ResponseEntity.ok(popupVisitorAgeStatsService.getConversionRate(id));
    }

    @GetMapping("/{id}/keywords")
    public ResponseEntity<?> getPopupKeywords(@PathVariable Long id) {
        return ResponseEntity.ok(popupService.getPopupKeywordIds(id));
    }

    @GetMapping("/by-keyword/{keywordId}")
    public ResponseEntity<?> getPopupsByKeyword(@PathVariable Long keywordId) {
        return ResponseEntity.ok(popupService.getPopupsByKeyword(keywordId));
    }
}