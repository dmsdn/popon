package popupteam.popupbackend.domain.consumer.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;

import java.util.Map;

/**
 * 개발/테스트 전용 로그인.
 * 실제 카카오/구글 계정을 계속 새로 만들 필요 없이, 이 API로 진짜 Customer row + 진짜 JWT를 발급받아 쓴다.
 * 프론트에서 "Bearer TEST_MODE_TOKEN" 같은 가짜 문자열을 직접 만들어 보내면 절대 안 됨 —
 * 그건 실제 JWT가 아니라서 백엔드가 파싱하다 그냥 에러남. 반드시 이 API를 호출해서 받은 토큰을 써야 함.
 *
 * app.dev-login.enabled=true 로 켜져 있을 때만 동작 (운영 환경에서 실수로 열려있지 않도록 기본값 false).
 */
@RestController
@RequestMapping("/api/customer/dev-login")
@RequiredArgsConstructor
public class DevAuthController {

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    @Value("${app.dev-login.enabled:false}")
    private boolean devLoginEnabled;

    public static class DevLoginRequest {
        public String testId; // 개발자가 원하는 테스트 계정 식별자 (예: "tester1"). 안 주면 기본값 사용.
        public String nickname;
    }

    @PostMapping
    public Map<String, Object> devLogin(@RequestBody(required = false) DevLoginRequest request) {
        if (!devLoginEnabled) {
            throw new RuntimeException("개발용 로그인은 app.dev-login.enabled=true 설정에서만 사용할 수 있어요.");
        }

        String testId = (request != null && request.testId != null && !request.testId.isBlank())
                ? request.testId
                : "default";
        String socialId = "dev-" + testId;
        String nickname = (request != null && request.nickname != null && !request.nickname.isBlank())
                ? request.nickname
                : "테스트유저(" + testId + ")";

        // 카카오/구글과 동일한 규칙: 활성 계정 있으면 그거 쓰고, 없으면(신규거나 탈퇴 후 재가입) 새로 만든다.
        Customer customer = customerRepository
                .findByProviderAndSocialIdAndWithdrawnFalse(Customer.Provider.DEV, socialId)
                .orElseGet(() -> {
                    long joinCount = customerRepository.countByProviderAndSocialId(Customer.Provider.DEV, socialId);
                    String displayProviderId = (joinCount == 0) ? socialId : (socialId + "_" + (joinCount + 1));

                    Customer newCustomer = new Customer();
                    newCustomer.setProvider(Customer.Provider.DEV);
                    newCustomer.setSocialId(socialId);
                    newCustomer.setProviderId(displayProviderId);
                    newCustomer.setNickname(nickname);
                    return customerRepository.save(newCustomer);
                });

        String token = jwtUtil.generateToken(customer.getId(), customer.getNickname(), customer.getProvider().name());

        return Map.of(
                "token", token,
                "customerId", customer.getId(),
                "provider", customer.getProvider().name(),
                "nickname", customer.getNickname()
        );
    }
}