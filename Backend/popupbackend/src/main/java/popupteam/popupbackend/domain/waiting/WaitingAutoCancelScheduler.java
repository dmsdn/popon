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

    // 1분마다 체크
    @Scheduled(fixedRate = 60000)
    public void autoCancelExpired() {
        List<WaitingQueue> expired = waitingQueueRepository
                .findByStatusAndCallExpiresAtBefore(WaitingStatus.CALLED, LocalDateTime.now());

        for (WaitingQueue w : expired) {
            w.setStatus(WaitingStatus.CANCELLED);
        }

        if (!expired.isEmpty()) {
            waitingQueueRepository.saveAll(expired);
            log.info("호출 후 15분 초과로 자동취소된 대기 {}건", expired.size());
        }
    }
}