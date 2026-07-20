package com.popupplatform.backend.controller;

import com.popupplatform.backend.entity.Reservation;
import com.popupplatform.backend.repository.ReservationRepository;
import com.popupplatform.backend.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationRepository reservationRepository;
    private final JwtUtil jwtUtil;

    // 예약 생성
    @PostMapping
    public Reservation createReservation(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> body
    ) {
        Long customerId = extractCustomerId(authHeader);

        Reservation reservation = new Reservation();
        reservation.setCustomerId(customerId);
        reservation.setPopupId(Long.valueOf(body.get("popupId").toString()));
        reservation.setVisitDate(LocalDate.parse((String) body.get("visitDate")));
        reservation.setVisitTime(LocalTime.parse((String) body.get("visitTime")));
        reservation.setPartySize(Integer.valueOf(body.get("partySize").toString()));

        return reservationRepository.save(reservation);
    }

    // 내 예약 목록 조회
    @GetMapping
    public List<Reservation> getMyReservations(@RequestHeader("Authorization") String authHeader) {
        Long customerId = extractCustomerId(authHeader);
        return reservationRepository.findByCustomerId(customerId);
    }

    // 예약 취소
    @PatchMapping("/{id}/cancel")
    public Map<String, Object> cancelReservation(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long id
    ) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("예약을 찾을 수 없어요."));

        reservation.setStatus(Reservation.Status.CANCELLED);
        reservationRepository.save(reservation);

        return Map.of("success", true);
    }

    private Long extractCustomerId(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.getCustomerIdFromToken(token);
    }
}