package popupteam.popupbackend.domain.eventlog;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionEventLogRepository extends JpaRepository<TransactionEventLog, Long> {
    List<TransactionEventLog> findByPopupIdOrderByCreatedAtDesc(Long popupId);
}