package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class RegionController {

    private final RegionRepository regionRepository;
    private final CustomerRegionRepository customerRegionRepository;
    private final JwtUtil jwtUtil;
    private final popupteam.popupbackend.domain.popup.PopupRepository popupRepository;

    // 프론트에서 관심 지역 체크박스(서울/부산/대구...) 그릴 때 쓰는 목록 조회. 로그인 불필요.
    @GetMapping("/api/regions")
    public List<Map<String, Object>> getRegions() {
        return regionRepository.findAll().stream()
                .map(r -> Map.<String, Object>of("id", r.getId(), "name", r.getName()))
                .toList();
    }

    // 소비자 본인의 관심 지역 저장 (덮어쓰기 방식 - InterestController.saveInterests와 동일 패턴)
    @PostMapping("/api/customer/regions")
    public Map<String, Object> saveRegions(@RequestHeader("Authorization") String authHeader,
                                            @RequestBody Map<String, List<Long>> body) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);
        List<Long> regionIds = body.get("regionIds");

        customerRegionRepository.deleteByCustomerId(customerId);

        for (Long regionId : regionIds) {
            CustomerRegion cr = new CustomerRegion();
            cr.setCustomerId(customerId);
            cr.setRegionId(regionId);
            customerRegionRepository.save(cr);
        }

        return Map.of("success", true, "count", regionIds.size());
    }

    // 내가 고른 관심 지역 목록 조회 (id + name 같이 내려줌)
    @GetMapping("/api/customer/regions/mine")
    public List<Map<String, Object>> getMyRegions(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);

        List<Long> regionIds = customerRegionRepository.findByCustomerId(customerId).stream()
                .map(CustomerRegion::getRegionId)
                .toList();

        if (regionIds.isEmpty()) {
            return List.of();
        }

        return regionRepository.findAllById(regionIds).stream()
                .map(r -> Map.<String, Object>of("id", r.getId(), "name", r.getName()))
                .toList();
    }

    // 내 관심 지역에 해당하는 진행중(OPEN) 팝업만 조회
    @GetMapping("/api/customer/popups/by-region")
    public List<Map<String, Object>> getPopupsByMyRegions(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);

        List<Long> regionIds = customerRegionRepository.findByCustomerId(customerId).stream()
                .map(CustomerRegion::getRegionId)
                .toList();

        if (regionIds.isEmpty()) {
            return List.of(); // 관심 지역을 아직 안 골랐으면 빈 목록
        }

        return popupRepository.findByAddressKeywordIdInAndStatusOrderByCreatedAtDesc(
                        regionIds, popupteam.popupbackend.domain.popup.PopupStatus.OPEN)
                .stream()
                .map(p -> {
                    Map<String, Object> m = new java.util.HashMap<>();
                    m.put("id", p.getId());
                    m.put("title", p.getTitle());
                    m.put("location", p.getLocation());
                    m.put("regionName", p.getAddressKeyword() != null ? p.getAddressKeyword().getName() : null);
                    return m;
                })
                .toList();
    }
}