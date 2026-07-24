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

    // 슬롯 목록 조회용 예약 인원 집계 — 슬롯마다 findBySlotId를 반복하면 슬롯 수만큼 쿼리가 나가
    // 원격 DB(Aiven)에서는 수십 초까지 걸리므로, 팝업 단위 GROUP BY 한 번으로 대체 (row: [slotId, SUM(partySize)])
    @Query("SELECT r.slot.id, SUM(r.partySize) FROM Reservation r " +
            "WHERE r.slot.popup.id = :popupId AND r.status = 'CONFIRMED' " +
            "GROUP BY r.slot.id")
    List<Object[]> sumConfirmedPartySizeBySlot(@Param("popupId") Long popupId);

    boolean existsBySlotId(Long slotId);

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


    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.popup.id = :popupId " +
            "AND r.entryStatus = 'CHECKED_IN' AND r.checkedInAt >= :since")
    long countRecentlyCheckedIn(@Param("popupId") Long popupId, @Param("since") java.time.LocalDateTime since);

    // 체크인은 했지만 아직 퇴장하지 않은 예약 (현재 체류 중)
    @Query("SELECT r FROM Reservation r WHERE r.popup.id = :popupId " +
            "AND r.entryStatus = 'CHECKED_IN' AND r.exitedAt IS NULL " +
            "ORDER BY r.checkedInAt ASC")
    List<Reservation> findCurrentlyInsideByPopupId(@Param("popupId") Long popupId);

}