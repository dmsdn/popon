package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupLiveStatusService;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.popup.PopupStatus;
import popupteam.popupbackend.domain.popup.dto.PopupLiveStatusResponse;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import popupteam.popupbackend.domain.waiting.WaitingStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class CongestionAlertScheduler {

    private final PopupRepository popupRepository;
    private final PopupLiveStatusService popupLiveStatusService;
    private final WaitingQueueRepository waitingQueueRepository;
    private final NoticeService noticeService;

    // 팝업별 마지막 혼잡 알림 시각 (같은 혼잡 상태에서 반복 알림 방지용)
    private final Map<Long, LocalDateTime> lastNotifiedAt = new ConcurrentHashMap<>();
    private static final long COOLDOWN_MINUTES = 30;

    // 5분마다 실행
    //@Scheduled(fixedRate = 10000)
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void checkCongestion() {
        List<Popup> openPopups = popupRepository.findByStatus(PopupStatus.OPEN);
        int notifiedCount = 0;

        for (Popup popup : openPopups) {
            PopupLiveStatusResponse status = popupLiveStatusService.getLiveStatus(popup.getId());
            if (!"혼잡".equals(status.getCongestionLabel())) continue;

            LocalDateTime last = lastNotifiedAt.get(popup.getId());
            if (last != null && last.isAfter(LocalDateTime.now().minusMinutes(COOLDOWN_MINUTES))) {
                continue; // 쿨다운 중이면 스킵
            }

            Set<Long> waitingCustomerIds = new HashSet<>();
            for (WaitingQueue w : waitingQueueRepository.findByPopupIdAndStatusIn(popup.getId(), List.of(WaitingStatus.WAITING, WaitingStatus.CALLED))) {
                if (w.getCustomer() != null) waitingCustomerIds.add(w.getCustomer().getId());
            }

            if (!waitingCustomerIds.isEmpty()) {
                noticeService.sendCongestionAlert(popup, waitingCustomerIds);
                lastNotifiedAt.put(popup.getId(), LocalDateTime.now());
                notifiedCount++;
            }
        }

        if (notifiedCount > 0) {
            log.info("혼잡 알림 발송 완료 - {}개 팝업", notifiedCount);
        }
    }
}