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

@RestController
@RequestMapping("/api/customer/me")
@RequiredArgsConstructor
public class CustomerController {

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
            customer.setGender(Customer.Gender.valueOf(request.getGender().toUpperCase()));
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            customer.setPhone(request.getPhone());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            customer.setEmail(request.getEmail().trim());
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

        // [정책 변경] DB 정보는 그대로 보존. withdrawn 플래그만 세워서 비활성화.
        // 같은 소셜 계정으로 다시 로그인하면 이 row는 그대로 두고 새 계정(id_2 등)이 생성됨.
        customer.setWithdrawn(true);
        customer.setWithdrawnAt(LocalDateTime.now());

        customerRepository.save(customer);
        return Map.of("success", true);
    }
}