package popupteam.popupbackend.domain.eventlog;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TransactionEventLogService {

    private final TransactionEventLogRepository transactionEventLogRepository;

    public void log(Long popupId, String entityType, Long entityId, String eventType, String actor, String memo) {
        TransactionEventLog log = new TransactionEventLog();
        log.setPopupId(popupId);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setEventType(eventType);
        log.setActor(actor);
        log.setMemo(memo);
        transactionEventLogRepository.save(log);
    }
}