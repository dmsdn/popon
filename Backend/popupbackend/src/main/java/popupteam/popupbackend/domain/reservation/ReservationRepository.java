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

    @Query("SELECT new popupteam.popupbackend.domain.reservation.dto.PopupVisitorCountProjection(" +
            "r.popup.id, r.popup.title, r.popup.business.companyName, COUNT(r)) " +
            "FROM Reservation r WHERE r.entryStatus = popupteam.popupbackend.domain.reservation.EntryStatus.CHECKED_IN " +
            "GROUP BY r.popup.id, r.popup.title, r.popup.business.companyName " +
            "ORDER BY COUNT(r) DESC")
    List<popupteam.popupbackend.domain.reservation.dto.PopupVisitorCountProjection> findVisitorRankingAllTime();

    @Query("SELECT new popupteam.popupbackend.domain.reservation.dto.PopupVisitorCountProjection(" +
            "r.popup.id, r.popup.title, r.popup.business.companyName, COUNT(r)) " +
            "FROM Reservation r WHERE r.entryStatus = popupteam.popupbackend.domain.reservation.EntryStatus.CHECKED_IN " +
            "AND r.reservationDate = :date " +
            "GROUP BY r.popup.id, r.popup.title, r.popup.business.companyName " +
            "ORDER BY COUNT(r) DESC")
    List<popupteam.popupbackend.domain.reservation.dto.PopupVisitorCountProjection> findVisitorRankingByDate(@Param("date") LocalDate date);

    @Query("SELECT r FROM Reservation r LEFT JOIN r.slot s WHERE r.popup.id = :popupId " +
            "AND r.status = 'CONFIRMED' AND r.entryStatus = 'PENDING' " +
            "AND ((s IS NOT NULL AND FUNCTION('TIMESTAMP', s.slotDate, s.startTime) <= :now) " +
            "OR (s IS NULL AND r.reservationDate <= :today)) " +
            "ORDER BY r.createdAt ASC")
    List<Reservation> findArrivedPreReservations(@Param("popupId") Long popupId,
                                                 @Param("now") java.time.LocalDateTime now,
                                                 @Param("today") java.time.LocalDate today);

}