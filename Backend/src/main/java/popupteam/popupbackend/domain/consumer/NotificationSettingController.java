package popupteam.popupbackend.domain.consumer;

import lombok.RequiredArgsConstructor;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 마이페이지 "알림 설정" 화면용 - 팝업 소식 알림 / 예약·웨이팅 알림 / 마케팅 정보 수신 ON-OFF.
 * 필수 약관(termsAgreed/privacyAgreed)은 여기서 안 건드림 - 그건 signup-info 전용.
 */
@RestController
@RequestMapping("/api/customer/notification-settings")
@RequiredArgsConstructor
public class NotificationSettingController {

    private final CustomerAccountRepository customerRepository;
    private final JwtUtil jwtUtil;

    public static class NotificationSettingRequest {
        public Boolean popupNewsAgreed;
        public Boolean reservationWaitingAgreed;
        public Boolean marketingAgreed;
    }

    @GetMapping
    public Map<String, Object> getSettings(@RequestHeader("Authorization") String authHeader) {
        Customer customer = findCustomer(authHeader);
        return toResponse(customer);
    }

    @PatchMapping
    public Map<String, Object> updateSettings(@RequestHeader("Authorization") String authHeader,
                                               @RequestBody NotificationSettingRequest request) {
        Customer customer = findCustomer(authHeader);

        if (request.popupNewsAgreed != null) {
            customer.setPopupNewsAgreed(request.popupNewsAgreed);
        }
        if (request.reservationWaitingAgreed != null) {
            customer.setReservationWaitingAgreed(request.reservationWaitingAgreed);
        }
        if (request.marketingAgreed != null) {
            customer.setMarketingAgreed(request.marketingAgreed);
        }

        customerRepository.save(customer);
        return toResponse(customer);
    }

    private Map<String, Object> toResponse(Customer customer) {
        return Map.of(
                "popupNewsAgreed", customer.getPopupNewsAgreed(),
                "reservationWaitingAgreed", customer.getReservationWaitingAgreed(),
                "marketingAgreed", customer.getMarketingAgreed()
        );
    }

    private Customer findCustomer(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        Long customerId = jwtUtil.getCustomerIdFromToken(token);
        return customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없어요."));
    }
}