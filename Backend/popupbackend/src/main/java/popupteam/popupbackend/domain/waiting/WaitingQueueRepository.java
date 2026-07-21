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
}