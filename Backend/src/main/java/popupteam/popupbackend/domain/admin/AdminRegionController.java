package popupteam.popupbackend.domain.admin;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.consumer.CustomerRegionRepository;
import popupteam.popupbackend.domain.consumer.Region;
import popupteam.popupbackend.domain.consumer.RegionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 관리자가 관심 지역(성수/강남/홍대 등)을 직접 추가/삭제하는 API.
 * 소비자용 GET /api/regions(RegionController)가 여기서 관리한 목록을 보여줌.
 * 팝업 등록 시 address_keyword(FK)로 참조하는 것도 이 region 테이블임.
 */
@RestController
@RequestMapping("/api/admin/regions")
@RequiredArgsConstructor
public class AdminRegionController {

    private final RegionRepository regionRepository;
    private final CustomerRegionRepository customerRegionRepository;
    private final popupteam.popupbackend.domain.popup.PopupRepository popupRepository;

    private void requireAdmin(Authentication authentication) {
        String name = authentication.getName();
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    @GetMapping
    public List<Map<String, Object>> list(Authentication authentication) {
        requireAdmin(authentication);
        return regionRepository.findAll().stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.getId(),
                        "name", r.getName(),
                        "customerCount", customerRegionRepository.countByRegionId(r.getId()),
                        // 8/5 - 이 지역을 선택한 팝업 수. 삭제는 RESTRICT라 팝업이 있으면 막히는데,
                        // 그 사실을 삭제 버튼을 누르기 전에 표에서 미리 볼 수 있게 한다
                        "popupCount", popupRepository.countByAddressKeyword_Id(r.getId())
                ))
                .toList();
    }

    public static class RegionCreateRequest {
        public String name;
    }

    @PostMapping
    public ResponseEntity<?> create(Authentication authentication, @RequestBody RegionCreateRequest request) {
        requireAdmin(authentication);
        if (request.name == null || request.name.isBlank()) {
            throw new IllegalArgumentException("지역 이름을 입력해주세요.");
        }
        if (regionRepository.existsByName(request.name)) {
            throw new IllegalArgumentException("이미 있는 지역이에요.");
        }
        Region saved = regionRepository.save(new Region(request.name));
        return ResponseEntity.status(201).body(Map.of("id", saved.getId(), "name", saved.getName()));
    }

    // 지역 삭제. 팝업이 사용 중이어도 강제 삭제 가능 - popup.address_keyword를 null로 비운 뒤 지역을 지운다
    // (팝업 자체는 삭제되지 않고 지역 정보만 없어짐). 소비자가 관심지역으로 찜해뒀어도 customer_region
    // 매핑을 지워서 자동 해지되게 한다.
    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public Map<String, Object> delete(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        if (!regionRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 지역이에요.");
        }
        popupRepository.clearAddressKeywordByRegionId(id);
        customerRegionRepository.deleteByRegionId(id);
        regionRepository.deleteById(id);
        return Map.of("success", true);
    }

    // 이 지역에 속한 팝업 전체 조회 (상태 무관 - 심사대기/반려 포함, 관리자 화면 "지역 카드 클릭"용)
    @GetMapping("/{id}/popups")
    public ResponseEntity<?> getPopupsByRegion(Authentication authentication, @PathVariable Long id) {
        requireAdmin(authentication);
        if (!regionRepository.existsById(id)) {
            throw new IllegalArgumentException("존재하지 않는 지역이에요.");
        }
        List<popupteam.popupbackend.domain.popup.dto.PopupResponse> popups = popupRepository
                .findByAddressKeywordIdOrderByCreatedAtDesc(id).stream()
                .map(popupteam.popupbackend.domain.popup.dto.PopupResponse::from)
                .toList();
        return ResponseEntity.ok(popups);
    }
}