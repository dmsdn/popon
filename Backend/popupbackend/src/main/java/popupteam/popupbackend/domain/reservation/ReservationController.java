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
}