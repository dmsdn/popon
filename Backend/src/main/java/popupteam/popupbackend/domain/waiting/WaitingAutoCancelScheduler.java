package popupteam.popupbackend.domain.waiting;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class WaitingAutoCancelScheduler {

    private final WaitingQueueRepository waitingQueueRepository;
    private final popupteam.popupbackend.domain.eventlog.TransactionEventLogService transactionEventLogService;

    // 1분마다 체크
    @Scheduled(fixedRate = 60000)
    public void autoCancelExpired() {
        List<WaitingQueue> expired = waitingQueueRepository
                .findByStatusAndCallExpiresAtBefore(WaitingStatus.CALLED, LocalDateTime.now());

        for (WaitingQueue w : expired) {
            w.setStatus(WaitingStatus.CANCELLED);
            transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(),
                    "AUTO_CANCELLED", "system", "호출 후 15분 초과 자동취소");
        }

        if (!expired.isEmpty()) {
            waitingQueueRepository.saveAll(expired);
            log.info("호출 후 15분 초과로 자동취소된 대기 {}건", expired.size());
        }
    }
}