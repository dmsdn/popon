package popupteam.popupbackend.domain.consumer;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * 카카오/구글은 전화번호를 안 줘서, 첫 로그인 직후 프론트가 "회원정보 입력" 화면으로
 * 보낸 뒤 이 API로 닉네임/전화번호/이메일/생년월일/성별/약관동의를 받아 저장한다.
 *
 * [정책 변경] 이제 소셜 로그인 시점엔 DB에 Customer row가 안 생긴다.
 * - 신규 가입자: Authorization에 "가입대기 토큰"(pending)이 들어옴 -> 이 시점에 처음으로 Customer row 생성
 * - 이미 가입된 사람이 나중에 정보 수정: 평소처럼 진짜 토큰(customerId 있는) 들어옴 -> 기존 row 업데이트
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
        public String birthDate;   // 선택, "yyyy-MM-dd" 형식
        public String gender;      // 선택, "MALE" / "FEMALE" / "UNKNOWN"
        public boolean termsAgreed;      // [필수] 서비스 이용약관 동의
        public boolean privacyAgreed;    // [필수] 개인정보 수집 및 이용 동의
        public boolean locationAgreed;   // [선택] 위치 정보 이용 동의
        public boolean marketingAgreed;  // [선택] 마케팅 정보 수신 동의
    }

    // 지금 로그인한(또는 가입대기 중인) 유저가 회원정보 입력을 마쳤는지 확인.
    // 가입대기 토큰이면 애초에 DB row가 없으니 무조건 false.
    @GetMapping("/status")
    public Map<String, Object> getStatus(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (jwtUtil.isPendingSignupToken(token)) {
            return Map.of("signupCompleted", false);
        }
        Customer customer = findCustomer(token);
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

        String token = authHeader.replace("Bearer ", "");

        Customer customer = jwtUtil.isPendingSignupToken(token)
                ? createFromPendingToken(token)
                : findCustomer(token);

        applyRequestToCustomer(customer, request);
        customerRepository.save(customer);

        String realToken = jwtUtil.generateToken(customer.getId(), customer.getNickname(), customer.getProvider().name());
        return Map.of("success", true, "customerId", customer.getId(), "token", realToken);
    }

    // 가입대기 토큰 안에 있던 소셜 정보(provider/socialId/닉네임/이메일/프로필사진)로 진짜 Customer row를 처음 생성
    private Customer createFromPendingToken(String token) {
        Claims claims = jwtUtil.parseClaims(token);
        Customer.Provider provider = Customer.Provider.valueOf(claims.get("provider", String.class));
        String socialId = claims.get("socialId", String.class);

        // CustomOAuth2UserService/OAuth2SuccessHandler에서 쓰던 채번 로직과 동일 (원본id / 원본id_2 / ...)
        long joinCount = customerRepository.countByProviderAndSocialId(provider, socialId);
        String displayProviderId = (joinCount == 0) ? socialId : (socialId + "_" + (joinCount + 1));

        Customer customer = new Customer();
        customer.setProvider(provider);
        customer.setSocialId(socialId);
        customer.setProviderId(displayProviderId);
        customer.setNickname(claims.get("nickname", String.class));
        customer.setEmail(claims.get("email", String.class));
        customer.setProfileImage(claims.get("profileImage", String.class));
        return customer;
    }

    private void applyRequestToCustomer(Customer customer, SignupInfoRequest request) {
        if (request.nickname != null && !request.nickname.isBlank()) {
            customer.setNickname(request.nickname);
        }
        customer.setPhone(request.phone);
        if (request.email != null && !request.email.isBlank() && !EMAIL_PATTERN.matcher(request.email).matches()) {
                throw new IllegalArgumentException("이메일 형식이 올바르지 않아요.");
        }
        if (request.birthDate != null && !request.birthDate.isBlank()) {
            try {
                customer.setBirthDate(LocalDate.parse(request.birthDate));
            } catch (Exception e) {
                throw new IllegalArgumentException("생년월일 형식이 올바르지 않아요. (yyyy-MM-dd)");
            }
        }
        if (request.gender != null && !request.gender.isBlank()) {
            try {
                customer.setGender(Customer.Gender.valueOf(request.gender.toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("성별 값이 올바르지 않아요. (MALE/FEMALE/UNKNOWN)");
            }
        }
        customer.setTermsAgreed(request.termsAgreed);
        customer.setPrivacyAgreed(request.privacyAgreed);
        customer.setLocationAgreed(request.locationAgreed);
        customer.setMarketingAgreed(request.marketingAgreed);
        customer.setSignupCompleted(true);
    }

    private Customer findCustomer(String token) {
        Long customerId = jwtUtil.getCustomerIdFromToken(token);
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없어요."));
    }
}