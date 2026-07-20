package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.domain.reservation.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<?> create(@RequestParam Long customerId,
                                    @Valid @RequestBody ReservationCreateRequest request) {
        return ResponseEntity.status(201).body(reservationService.create(customerId, request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<ReservationResponse>> myReservations(@RequestParam Long customerId) {
        return ResponseEntity.ok(reservationService.findByCustomer(customerId));
    }
}