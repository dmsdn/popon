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

    // 예약자 명단 조회용 - popup/customer/slot을 한 번에 JOIN FETCH (N+1 방지)
    // slot은 FREE 모드면 null이라 LEFT JOIN FETCH
    @Query("SELECT r FROM Reservation r " +
            "JOIN FETCH r.popup " +
            "JOIN FETCH r.customer " +
            "LEFT JOIN FETCH r.slot " +
            "WHERE r.popup.id = :popupId " +
            "ORDER BY r.reservationDate ASC, r.createdAt ASC")
    List<Reservation> findByPopupId(@Param("popupId") Long popupId);

    Optional<Reservation> findByQrToken(String qrToken);

    // 팝업의 슬롯별 확정 예약 인원 합계를 한 번에 계산 (대기시간 계산 시 N+1 방지)
    @Query("SELECT r.slot.id, SUM(r.partySize) FROM Reservation r " +
            "WHERE r.popup.id = :popupId AND r.status = 'CONFIRMED' AND r.slot IS NOT NULL " +
            "GROUP BY r.slot.id")
    List<Object[]> sumConfirmedPartySizeBySlot(@Param("popupId") Long popupId);

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

    // 팝업 구분 없이 전체 체크인 상태(아직 퇴장 전) 조회 - 자동퇴장 스케줄러용
    List<Reservation> findByEntryStatusAndExitedAtIsNull(EntryStatus entryStatus);

}