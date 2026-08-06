package popupteam.popupbackend.domain.reservation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findBySlotId(Long slotId);
    List<Reservation> findByCustomerId(Long customerId);

    // 정원 계산 시 취소된 예약은 제외해야 하므로 status 조건 추가
    List<Reservation> findBySlotIdAndStatus(Long slotId, ReservationStatus status);
    List<Reservation> findByPopupIdAndReservationDateAndStatus(Long popupId, LocalDate reservationDate, ReservationStatus status);

    // 알림 #2 - 오늘이 예약 날짜인 전체 예약 (팝업 무관, 매일 스케줄러가 조회)
    List<Reservation> findByReservationDateAndStatus(LocalDate reservationDate, ReservationStatus status);

    // 알림 #3 - 예약 시간 임박 체크용. reservationTime이 있는 것만(FREE 모드 중 시간 지정) +
    // SLOT 모드는 slot.startTime을 기준으로 별도 조회가 필요해서 여기선 reservationTime 있는 건만 다룸.
    @Query("SELECT r FROM Reservation r WHERE r.reservationDate = :date AND r.status = :status " +
            "AND r.reservationTime IS NOT NULL AND r.entryStatus = 'PENDING'")
    List<Reservation> findFreeModeUpcomingToday(@Param("date") LocalDate date, @Param("status") ReservationStatus status);

    // SLOT 모드는 슬롯의 시작 시각 기준으로 임박 여부를 판단해야 해서, 오늘 날짜의 확정된 SLOT 예약을 조회
    @Query("SELECT r FROM Reservation r WHERE r.reservationDate = :date AND r.status = :status " +
            "AND r.slot IS NOT NULL AND r.entryStatus = 'PENDING'")
    List<Reservation> findSlotModeUpcomingToday(@Param("date") LocalDate date, @Param("status") ReservationStatus status);


    // 슬롯 삭제 가능 여부 판정용 (PopupSlotService.generate — 예약이 하나라도 있으면 슬롯 유지)
    boolean existsBySlotId(Long slotId);

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

    // 그 날짜에 방문하기로 한 예약 전부 — 상태를 가리지 않는다 (8/4).
    // 슬롯 예약은 슬롯 날짜, 날짜 예약은 reservationDate 기준. 관제 화면의 「그날 명단」용이라
    // 입장·노쇼된 건도 함께 와야 처리 결과가 배지로 남는다.
    @Query("SELECT r FROM Reservation r LEFT JOIN r.slot s WHERE r.popup.id = :popupId " +
            "AND r.status = 'CONFIRMED' " +
            "AND ((s IS NOT NULL AND s.slotDate = :date) OR (s IS NULL AND r.reservationDate = :date)) " +
            "ORDER BY r.createdAt ASC")
    List<Reservation> findDayRoster(@Param("popupId") Long popupId, @Param("date") LocalDate date);

    // 자정 리셋 대상 — 그날 방문 예정이었는데 입장·노쇼 처리 없이 남은 예약 (8/4)
    @Query("SELECT r FROM Reservation r LEFT JOIN r.slot s " +
            "WHERE r.status = 'CONFIRMED' AND r.entryStatus = 'PENDING' " +
            "AND ((s IS NOT NULL AND s.slotDate = :date) OR (s IS NULL AND r.reservationDate = :date))")
    List<Reservation> findUnprocessedOfDay(@Param("date") LocalDate date);

    List<Reservation> findByPopupIdAndStatus(Long popupId, ReservationStatus status);

    // 진짜 방문객(체크인 완료)의 연령 분포 통계용 - 예약만 하고 안 온 사람은 제외
    // 주의: birthDate가 NULL인 경우도 일부러 포함시킴 (미상 버킷으로 잡아서 성별 분포와 총 인원수를 맞추기 위함)
    @Query("SELECT r.customer.birthDate FROM Reservation r WHERE r.popup.id = :popupId " +
            "AND r.entryStatus = 'CHECKED_IN'")
    List<java.time.LocalDate> findBirthDatesOfCheckedInVisitors(@Param("popupId") Long popupId);

    // 진짜 방문객(체크인 완료)의 성별 분포 통계용
    @Query("SELECT r.customer.gender FROM Reservation r WHERE r.popup.id = :popupId " +
            "AND r.entryStatus = 'CHECKED_IN'")
    List<popupteam.popupbackend.domain.consumer.Customer.Gender> findGendersOfCheckedInVisitors(@Param("popupId") Long popupId);

// 일별 방문자 수 추이 - 예약 건수가 아니라 partySize 합계로 실제 방문 인원을 집계
// 예: 1건의 예약으로 3명이 체크인한 경우 방문자 3명으로 계산
@Query("SELECT FUNCTION('DATE', r.checkedInAt), COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
        "WHERE r.popup.id = :popupId AND r.entryStatus = 'CHECKED_IN' " +
        "AND r.checkedInAt >= :from AND r.checkedInAt < :to " +
        "GROUP BY FUNCTION('DATE', r.checkedInAt) ORDER BY FUNCTION('DATE', r.checkedInAt)")
List<Object[]> countDailyCheckedInVisitors(
        @Param("popupId") Long popupId,
        @Param("from") java.time.LocalDateTime from,
        @Param("to") java.time.LocalDateTime to
);

    // 누적 방문자 수 - 체크인 완료된 예약의 partySize(인원수) 전체 합산. 그룹 예약이면 인원수만큼 카운트됨
    @Query("SELECT COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
            "WHERE r.popup.id = :popupId AND r.entryStatus = 'CHECKED_IN'")
    Long sumVisitorsOfCheckedIn(@Param("popupId") Long popupId);

    // 일별 예약 건수 - 체크인 여부와 무관하게, 취소되지 않은 예약이 날짜별로 몇 건인지 (reservationDate 기준)
    @Query("SELECT r.reservationDate, COUNT(r) FROM Reservation r " +
            "WHERE r.popup.id = :popupId AND r.status = 'CONFIRMED' " +
            "AND r.reservationDate >= :from AND r.reservationDate <= :to " +
            "GROUP BY r.reservationDate ORDER BY r.reservationDate")
    List<Object[]> countDailyReservations(@Param("popupId") Long popupId,
                                           @Param("from") java.time.LocalDate from,
                                           @Param("to") java.time.LocalDate to);

    // 예약 전환율 계산용 - 취소되지 않은 전체 예약 건수
    long countByPopupIdAndStatus(Long popupId, ReservationStatus status);

    // 오늘 예약 요약(건수 + 인원 합) - 대시보드용 서버 사이드 집계.
    // 기존엔 프론트가 findByPopupId로 전체 예약을 다 받아서 reservationDate === 오늘 로 클라이언트에서 필터링했음.
    @Query("SELECT COUNT(r), COALESCE(SUM(r.partySize), 0) FROM Reservation r " +
            "WHERE r.popup.id = :popupId AND r.reservationDate = :date AND r.status = :status")
    Object[] sumTodayReservations(@Param("popupId") Long popupId,
                                   @Param("date") LocalDate date,
                                   @Param("status") ReservationStatus status);

    // 후기 작성 가능 여부 확인용 - 이 소비자가 이 팝업에 실제로 체크인(입장)한 예약이 있는지
    boolean existsByPopup_IdAndCustomer_IdAndEntryStatus(Long popupId, Long customerId, EntryStatus entryStatus);

}