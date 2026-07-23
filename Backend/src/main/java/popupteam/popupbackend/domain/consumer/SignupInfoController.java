package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 카카오/구글은 전화번호를 안 줘서, 첫 로그인 직후 프론트가 "회원정보 입력" 화면으로
 * 보낸 뒤 이 API로 닉네임/전화번호/이메일/약관동의를 받아 저장한다.
 */
@RestController
@RequestMapping("/api/customer/signup-info")
@RequiredArgsConstructor
public class SignupInfoController {

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    public static class SignupInfoRequest {
        public String nickname;
        public String phone;       // 필수
        public String email;       // 선택
        public boolean termsAgreed;      // [필수] 서비스 이용약관 동의
        public boolean privacyAgreed;    // [필수] 개인정보 수집 및 이용 동의
        public boolean locationAgreed;   // [선택] 위치 정보 이용 동의
        public boolean marketingAgreed;  // [선택] 마케팅 정보 수신 동의
    }

    // 지금 로그인한 유저가 회원정보 입력을 마쳤는지 확인 (프론트가 이 화면 보여줄지 판단할 때 씀)
    @GetMapping("/status")
    public Map<String, Object> getStatus(@RequestHeader("Authorization") String authHeader) {
        Customer customer = findCustomer(authHeader);
        return Map.of("signupCompleted", customer.getSignupCompleted());
    }

    @PostMapping
    public Map<String, Object> submit(@RequestHeader("Authorization") String authHeader,
                                       @RequestBody SignupInfoRequest request) {
        if (request.phone == null || request.phone.isBlank()) {
            throw new IllegalArgumentException("전화번호는 필수예요.");
        }
        if (!request.termsAgreed || !request.privacyAgreed) {
            throw new IllegalArgumentException("필수 약관에 모두 동의해야 해요.");
        }

        Customer customer = findCustomer(authHeader);

        if (request.nickname != null && !request.nickname.isBlank()) {
            customer.setNickname(request.nickname);
        }
        customer.setPhone(request.phone);
        if (request.email != null && !request.email.isBlank()) {
            customer.setEmail(request.email);
        }
        customer.setTermsAgreed(request.termsAgreed);
        customer.setPrivacyAgreed(request.privacyAgreed);
        customer.setLocationAgreed(request.locationAgreed);
        customer.setMarketingAgreed(request.marketingAgreed);
        customer.setSignupCompleted(true);

        customerRepository.save(customer);

        return Map.of("success", true, "customerId", customer.getId());
    }

    private Customer findCustomer(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없어요."));
    }
}