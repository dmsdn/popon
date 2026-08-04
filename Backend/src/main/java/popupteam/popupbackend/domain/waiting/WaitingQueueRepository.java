package popupteam.popupbackend.domain.waiting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WaitingQueueRepository extends JpaRepository<WaitingQueue, Long> {

    List<WaitingQueue> findByPopupIdAndStatusOrderByRegisteredAtAsc(Long popupId, WaitingStatus status);

    @Query("SELECT COALESCE(MAX(w.teamNumber), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.registeredAt >= :startOfDay")
    Integer findMaxTeamNumberToday(@Param("popupId") Long popupId, @Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT COUNT(w) FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'WAITING' AND w.id < :id")
    long countAheadOf(@Param("popupId") Long popupId, @Param("id") Long id);

    List<WaitingQueue> findByStatusAndCallExpiresAtBefore(WaitingStatus status, LocalDateTime time);

    java.util.Optional<WaitingQueue> findByQrToken(String qrToken);

    @Query("SELECT COUNT(w) FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'ENTERED' AND w.enteredAt >= :since")
    long countRecentlyEntered(@Param("popupId") Long popupId, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT w FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'ENTERED' AND w.exitedAt IS NULL " +
            "ORDER BY w.enteredAt ASC")
    List<WaitingQueue> findCurrentlyInsideByPopupId(@Param("popupId") Long popupId);
    // 팝업 구분 없이 전체 입장 상태(아직 퇴장 전) 조회 - 자동퇴장 스케줄러용
    List<WaitingQueue> findByStatusAndExitedAtIsNull(WaitingStatus status);

    List<WaitingQueue> findByPopupIdAndStatusIn(Long popupId, List<WaitingStatus> statuses);

    // 내 웨이팅 목록 조회용 (현재 대기중/호출됨 상태만, 여러 팝업 통틀어)
    List<WaitingQueue> findByCustomerIdAndStatusInOrderByRegisteredAtDesc(Long customerId, List<WaitingStatus> statuses);

    // 같은 계정의 동일 팝업 중복 웨이팅 방지용 - 이미 대기중/호출됨 상태인 웨이팅이 있는지 확인
    boolean existsByPopupIdAndCustomerIdAndStatusIn(Long popupId, Long customerId, List<WaitingStatus> statuses);
    // 후기 작성 가능 여부 확인용 - 이 소비자가 이 팝업에 실제로 입장(ENTERED)한 웨이팅 기록이 있는지
    boolean existsByPopupIdAndCustomerIdAndStatus(Long popupId, Long customerId, WaitingStatus status);

    // 누적 방문자 통계용 - 회원 웨이팅으로 입장한 인원만 (비회원은 정책상 통계 제외)
    @Query("SELECT COALESCE(SUM(w.partySize), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.status = 'ENTERED' AND w.customer IS NOT NULL")
    long sumMemberVisitorsOfEntered(@Param("popupId") Long popupId);

    // 일별 방문자 추이용 - 회원 웨이팅 입장자를 날짜별로 집계 (비회원 제외)
    @Query("SELECT FUNCTION('DATE', w.enteredAt), COALESCE(SUM(w.partySize), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.status = 'ENTERED' AND w.customer IS NOT NULL " +
            "AND w.enteredAt >= :from AND w.enteredAt < :to " +
            "GROUP BY FUNCTION('DATE', w.enteredAt) ORDER BY FUNCTION('DATE', w.enteredAt)")
    List<Object[]> countDailyMemberEntered(@Param("popupId") Long popupId,
                                           @Param("from") LocalDateTime from,
                                           @Param("to") LocalDateTime to);

}