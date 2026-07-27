package popupteam.popupbackend.domain.consumer;

import java.util.List;
import java.util.Map;

import org.springframework.transaction.annotation.Transactional;
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
    private final JwtUtil jwtUtil;

    public InterestController(
            CustomerKeywordRepository customerKeywordRepository,
            JwtUtil jwtUtil
    ) {
        this.customerKeywordRepository = customerKeywordRepository;
        this.jwtUtil = jwtUtil;
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