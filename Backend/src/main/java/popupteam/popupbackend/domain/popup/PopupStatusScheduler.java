package popupteam.popupbackend.domain.popup;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PopupStatusScheduler {

    private final PopupRepository popupRepository;

    // 5분마다 실행 (300,000ms)
    @Scheduled(fixedRate = 300000)
    public void updatePopupStatuses() {
        LocalDateTime now = LocalDateTime.now();

        // BEFOR → OPEN (시작일 도래)
        List<Popup> toOpen = popupRepository.findByStatusAndStartDateLessThanEqual(PopupStatus.BEFOR, now);
        for (Popup popup : toOpen) {
            popup.setStatus(PopupStatus.OPEN);
            popup.setUpdatedAt(now);
        }
        if (!toOpen.isEmpty()) {
            popupRepository.saveAll(toOpen);
            log.info("팝업 {}건 OPEN 전환", toOpen.size());
        }

        // OPEN → CLOSED (종료일 경과)
        List<Popup> toClose = popupRepository.findByStatusAndEndDateLessThanEqual(PopupStatus.OPEN, now);
        for (Popup popup : toClose) {
            popup.setStatus(PopupStatus.CLOSED);
            popup.setUpdatedAt(now);
        }
        if (!toClose.isEmpty()) {
            popupRepository.saveAll(toClose);
            log.info("팝업 {}건 CLOSED 전환", toClose.size());
        }
    }
}