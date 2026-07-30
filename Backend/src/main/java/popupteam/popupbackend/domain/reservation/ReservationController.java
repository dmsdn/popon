package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.consumer.auth.JwtUtil;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.reservation.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;
    private final PopupRepository popupRepository;
    private final BusinessRepository businessRepository;
    private final JwtUtil jwtUtil; // 소비자용 JWT (customerId 추출용) - WishlistController/ReviewController와 동일 패턴

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader("Authorization") String authHeader,
                                    @Valid @RequestBody ReservationCreateRequest request) {
        Long customerId = extractCustomerId(authHeader);
        return ResponseEntity.status(201).body(reservationService.create(customerId, request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<ReservationResponse>> myReservations(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);
        return ResponseEntity.ok(reservationService.findByCustomer(customerId));
    }

    @GetMapping("/popup/{popupId}")
    public ResponseEntity<?> getByPopup(@PathVariable Long popupId, Authentication authentication) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");

        if (!isAdmin) {
            Business business = businessRepository.findByEmail(name)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
            if (!popup.getBusiness().getId().equals(business.getId())) {
                throw new ForbiddenException("본인이 등록한 팝업의 예약자만 조회할 수 있습니다.");
            }
        }

        return ResponseEntity.ok(reservationService.getByPopup(popupId));
    }

    // === 예약 취소 (주최자/관리자 또는 예약 당사자 본인) ===
    // 소비자 본인 취소: Authorization 헤더의 소비자 JWT에서 customerId를 추출 (클라이언트가 준 값 신뢰 금지 - IDOR 방지)
    // 주최자/관리자 취소: Spring Security의 Authentication(email/admin) 사용
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestHeader(value = "Authorization", required = false) String authHeader,
                                    @RequestBody(required = false) ReservationCancelRequest request) {
        String reason = (request != null) ? request.getCancelReason() : null;

        Long customerId = extractCustomerIdOrNull(authHeader);
        if (customerId != null) {
            return ResponseEntity.ok(reservationService.cancelByCustomer(id, customerId, reason));
        }

        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("인증 정보가 없습니다. 로그인 후 다시 시도해주세요.");
        }

        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(reservationService.cancel(id, name, isAdmin, reason));
    }

    // === QR 스캔 입장확인 ===
    @PostMapping("/checkin/qr")
    public ResponseEntity<?> checkinByQr(Authentication authentication,
                                         @Valid @RequestBody QrCheckinRequest request) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(reservationService.checkinByQr(request.getQrToken(), name, isAdmin));
    }

    // === 수동 입장확인 (QR 인식 안 될 때 대비) ===
    @PatchMapping("/{id}/checkin")
    public ResponseEntity<?> checkinManual(@PathVariable Long id, Authentication authentication) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(reservationService.checkinManual(id, name, isAdmin));
    }

    // === 노쇼 처리 ===
    @PatchMapping("/{id}/no-show")
    public ResponseEntity<?> markNoShow(@PathVariable Long id, Authentication authentication) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        return ResponseEntity.ok(reservationService.markNoShow(id, name, isAdmin));
    }

    // === 예약 변경 (소비자 본인용, 다른 슬롯/날짜로) ===
    @PatchMapping("/{id}/change")
    public ResponseEntity<?> change(@PathVariable Long id,
                                    @RequestHeader("Authorization") String authHeader,
                                    @Valid @RequestBody ReservationChangeRequest request) {
        Long customerId = extractCustomerId(authHeader);
        return ResponseEntity.ok(reservationService.change(id, customerId, request));
    }

    // 토큰에서 customerId 뽑아내는 공통 로직 (WishlistController/ReviewController와 동일 패턴)
    private Long extractCustomerId(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            throw new IllegalArgumentException("인증 정보가 없습니다. 로그인 후 다시 시도해주세요.");
        }
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }

    // /{id}/cancel 은 소비자용 JWT와 주최자/관리자용 Authentication을 함께 받으므로,
    // 소비자 토큰이 아니거나 파싱에 실패하면 null을 반환해 주최자/관리자 경로로 넘어가게 한다.
    private Long extractCustomerIdOrNull(String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            return null;
        }
        try {
            String token = authHeader.replace("Bearer ", "");
            return jwtUtil.getCustomerIdFromToken(token);
        } catch (Exception e) {
            return null;
        }
    }
}