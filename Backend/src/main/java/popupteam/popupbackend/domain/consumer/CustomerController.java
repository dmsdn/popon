package popupteam.popupbackend.domain.consumer;

import popupteam.popupbackend.domain.consumer.dto.CustomerResponse;
import popupteam.popupbackend.domain.consumer.dto.CustomerUpdateRequest;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/customer/me")
@RequiredArgsConstructor
public class CustomerController {

    // 이메일 형식 검증. 프론트 회원가입 폼과 같은 계열의 규칙이므로 한쪽만 바꾸지 말 것 —
    // 어긋나면 프론트는 통과했는데 백엔드가 400을 주는 상황이 된다. (7/30 머지: jsw 버전 채택)
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    // 내 정보 조회
    @GetMapping
    public CustomerResponse getMyInfo(@RequestHeader("Authorization") String authHeader) {
        Customer customer = findCustomer(authHeader);
        return new CustomerResponse(customer);
    }

    // 닉네임/프로필 사진 수정
    @PatchMapping
    public CustomerResponse updateMyInfo(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CustomerUpdateRequest request) {
        Customer customer = findCustomer(authHeader);

        if (request.getNickname() != null && !request.getNickname().isBlank()) {
            customer.setNickname(request.getNickname());
        }
        if (request.getProfileImage() != null) {
            customer.setProfileImage(request.getProfileImage());
        }
        if (request.getBirthDate() != null) {
            customer.setBirthDate(request.getBirthDate());
        }
        if (request.getGender() != null) {
            try {
                customer.setGender(Customer.Gender.valueOf(request.getGender().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("성별 값이 올바르지 않아요. (MALE/FEMALE/UNKNOWN 중 하나여야 해요, 입력값: " + request.getGender() + ")");
            }
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            customer.setPhone(request.getPhone());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim();
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                throw new IllegalArgumentException("이메일 형식이 올바르지 않아요.");
            }
            customer.setEmail(email);
        }

        Customer saved = customerRepository.save(customer);
        return new CustomerResponse(saved);
    }

    private Customer findCustomer(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없어요."));
    }

    @DeleteMapping
    public Map<String, Object> withdraw(@RequestHeader("Authorization") String authHeader) {
        Customer customer = findCustomer(authHeader);

        // [정책 변경] 재가입 채번(providerId "_2" 등) 로직 때문에 provider/providerId/socialId는 남겨두되,
        // 그 외 개인정보(닉네임/연락처/이메일/프로필사진/생년월일/성별)는 탈퇴 즉시 마스킹 처리.
        // 같은 소셜 계정으로 다시 로그인하면 이 row는 그대로 두고 새 계정(id_2 등)이 생성됨.
        customer.setNickname("탈퇴한 회원");
        customer.setPhone(null);
        customer.setEmail(null);
        customer.setProfileImage(null);
        customer.setBirthDate(null);
        customer.setGender(Customer.Gender.UNKNOWN);
        customer.setMarketingAgreed(false);
        customer.setLocationAgreed(false);
        customer.setPopupNewsAgreed(false);
        customer.setReservationWaitingAgreed(false);

        customer.setWithdrawn(true);
        customer.setWithdrawnAt(LocalDateTime.now());

        customerRepository.save(customer);
        return Map.of("success", true);
    }
}