package popupteam.popupbackend.domain.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findBySlotId(Long slotId);
    List<Reservation> findByCustomerId(Long customerId);

    // 정원 계산 시 취소된 예약은 제외해야 하므로 status 조건 추가
    List<Reservation> findBySlotIdAndStatus(Long slotId, ReservationStatus status);
    List<Reservation> findByPopupIdAndReservationDateAndStatus(Long popupId, LocalDate reservationDate, ReservationStatus status);

    @Query("SELECT r FROM Reservation r WHERE r.popup.id = :popupId " +
            "ORDER BY r.reservationDate ASC, r.createdAt ASC")
    List<Reservation> findByPopupId(@Param("popupId") Long popupId);

    Optional<Reservation> findByQrToken(String qrToken);
}