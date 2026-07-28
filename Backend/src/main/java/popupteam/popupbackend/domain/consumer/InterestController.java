
package popupteam.popupbackend.domain.consumer;

import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import popupteam.popupbackend.domain.consumer.auth.JwtUtil;

@RestController
@RequestMapping("/api/customer")
public class InterestController {

    private final CustomerKeywordRepository customerKeywordRepository;
    private final KeywordRepository keywordRepository;
    private final JwtUtil jwtUtil;

    public InterestController(
            CustomerKeywordRepository customerKeywordRepository,
            KeywordRepository keywordRepository,
            JwtUtil jwtUtil
    ) {
        this.customerKeywordRepository = customerKeywordRepository;
        this.keywordRepository = keywordRepository;
        this.jwtUtil = jwtUtil;
    }

    // 내가 고른 관심 키워드 목록 조회 (id + name 같이 내려줌)
    @GetMapping("/interests")
    public List<Map<String, Object>> getMyInterests(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);

        List<Long> keywordIds = customerKeywordRepository.findByCustomerId(customerId).stream()
                .map(CustomerKeyword::getKeywordId)
                .toList();

        if (keywordIds.isEmpty()) {
            return List.of();
        }

        return keywordRepository.findAllById(keywordIds).stream()
                .map(k -> Map.<String, Object>of("id", k.getId(), "name", k.getName()))
                .toList();
    }

    @Transactional
    @PostMapping("/interests")
    public Map<String, Object> saveInterests(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, List<Long>> body
    ) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);

        List<Long> keywordIds = body.get("keywordIds");

        if (keywordIds == null) {
            throw new IllegalArgumentException("keywordIds가 필요합니다.");
        }

        customerKeywordRepository.deleteByCustomerId(customerId);

        for (Long keywordId : keywordIds) {
            CustomerKeyword customerKeyword = new CustomerKeyword();
            customerKeyword.setCustomerId(customerId);
            customerKeyword.setKeywordId(keywordId);

            customerKeywordRepository.save(customerKeyword);
        }

        return Map.of(
                "success", true,
                "count", keywordIds.size()
        );
    }
}