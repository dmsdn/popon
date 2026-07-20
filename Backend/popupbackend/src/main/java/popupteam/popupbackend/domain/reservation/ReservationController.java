package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
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

    @PostMapping
    public ResponseEntity<?> create(@RequestParam Long customerId,
                                    @Valid @RequestBody ReservationCreateRequest request) {
        return ResponseEntity.status(201).body(reservationService.create(customerId, request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<ReservationResponse>> myReservations(@RequestParam Long customerId) {
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

    // === 예약 취소 (주최자/관리자용) ===
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<?> cancel(@PathVariable Long id,
                                    Authentication authentication,
                                    @RequestBody(required = false) ReservationCancelRequest request) {
        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        String reason = (request != null) ? request.getCancelReason() : null;

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
}