package popupteam.popupbackend.domain.admin;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.admin.dto.AdminListResponse;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.business.dto.BusinessListResponse;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import popupteam.popupbackend.domain.consumer.dto.CustomerAdminResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

// 관리자 콘솔 "계정 관리" 화면용 - 관리자/주최자/소비자 계정 목록 조회 + 소비자 정지 기능
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminAccountController {

    private final AdminRepository adminRepository;
    private final BusinessRepository businessRepository;
    private final CustomerAccountRepository customerAccountRepository;

    private void checkAdmin(Authentication authentication) {
        String name = (authentication != null) ? authentication.getName() : null;
        if (name == null || !name.startsWith("admin:")) {
            throw new ForbiddenException("관리자만 접근할 수 있습니다.");
        }
    }

    // 관리자 계정 목록 (조회만, CRUD 없음)
    @GetMapping("/admins")
    public ResponseEntity<List<AdminListResponse>> getAdmins(Authentication authentication) {
        checkAdmin(authentication);
        List<AdminListResponse> result = adminRepository.findAll().stream()
                .map(AdminListResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    // 주최자 계정 목록 (조회만, 정지 기능 없음)
    @GetMapping("/businesses")
    public ResponseEntity<List<BusinessListResponse>> getBusinesses(Authentication authentication) {
        checkAdmin(authentication);
        List<BusinessListResponse> result = businessRepository.findAll().stream()
                .map(BusinessListResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    // 소비자 계정 목록
    @GetMapping("/customers")
    public ResponseEntity<List<CustomerAdminResponse>> getCustomers(Authentication authentication) {
        checkAdmin(authentication);
        List<CustomerAdminResponse> result = customerAccountRepository.findAll().stream()
                .map(CustomerAdminResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    // 소비자 계정 정지
    @PatchMapping("/customers/{id}/suspend")
    public ResponseEntity<?> suspendCustomer(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        Customer customer = customerAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        customer.setSuspended(true);
        customer.setSuspendedAt(java.time.LocalDateTime.now());
        customerAccountRepository.save(customer);

        return ResponseEntity.ok(Map.of("success", true));
    }

    // 소비자 계정 정지 해제
    @PatchMapping("/customers/{id}/resume")
    public ResponseEntity<?> resumeCustomer(@PathVariable Long id, Authentication authentication) {
        checkAdmin(authentication);
        Customer customer = customerAccountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        customer.setSuspended(false);
        customer.setSuspendedAt(null);
        customerAccountRepository.save(customer);

        return ResponseEntity.ok(Map.of("success", true));
    }
}