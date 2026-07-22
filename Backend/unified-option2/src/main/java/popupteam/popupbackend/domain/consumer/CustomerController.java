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

        // 개인정보는 최소화, 리뷰 등 콘텐츠는 유지
        customer.setWithdrawn(true);
        customer.setWithdrawnAt(LocalDateTime.now());
        customer.setNickname("탈퇴한 사용자");
        customer.setProfileImage(null);
        customer.setEmail(null);
        customer.setPhone(null);

        customerRepository.save(customer);
        return Map.of("success", true);
    }
}