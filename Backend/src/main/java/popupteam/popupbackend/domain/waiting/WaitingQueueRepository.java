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

}