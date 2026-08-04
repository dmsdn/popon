package popupteam.popupbackend.domain.waiting;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WaitingQueueRepository extends JpaRepository<WaitingQueue, Long> {

    List<WaitingQueue> findByPopupIdAndStatusOrderByRegisteredAtAsc(Long popupId, WaitingStatus status);

    // 하루치 웨이팅 전부 — 상태를 가리지 않는다 (8/4).
    // 관제 화면이 「그날의 명단」을 보여주기 위한 쿼리다. 입장·취소된 건도 함께 와야
    // 처리 결과가 배지로 남고, 지난 날짜를 골랐을 때 그날 기록을 그대로 볼 수 있다.
    @Query("SELECT w FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.registeredAt >= :startOfDay AND w.registeredAt < :endOfDay " +
            "ORDER BY w.registeredAt ASC")
    List<WaitingQueue> findDayRoster(@Param("popupId") Long popupId,
                                     @Param("startOfDay") LocalDateTime startOfDay,
                                     @Param("endOfDay") LocalDateTime endOfDay);

    // 자정 리셋 대상 — 그날 안에 아무 처리도 되지 않은 채 남은 대기 (8/4)
    @Query("SELECT w FROM WaitingQueue w WHERE w.status = :status " +
            "AND w.registeredAt >= :startOfDay AND w.registeredAt < :endOfDay")
    List<WaitingQueue> findUnprocessedOfDay(@Param("status") WaitingStatus status,
                                            @Param("startOfDay") LocalDateTime startOfDay,
                                            @Param("endOfDay") LocalDateTime endOfDay);

    @Query("SELECT COALESCE(MAX(w.teamNumber), 0) FROM WaitingQueue w " +
            "WHERE w.popup.id = :popupId AND w.registeredAt >= :startOfDay")
    Integer findMaxTeamNumberToday(@Param("popupId") Long popupId, @Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT COUNT(w) FROM WaitingQueue w WHERE w.popup.id = :popupId " +
            "AND w.status = 'WAITING' AND w.id < :id")
    long countAheadOf(@Param("popupId") Long popupId, @Param("id") Long id);

    // 호출 폐지(8/4)로 사용처가 사라졌다. CALLED를 만드는 경로가 없어 항상 빈 목록이 온다.
    // 스키마(call_expires_at)와 함께 남겨 두되 새로 쓰지 말 것.
    @Deprecated
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

}