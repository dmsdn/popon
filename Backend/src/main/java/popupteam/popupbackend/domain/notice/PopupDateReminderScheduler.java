package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PopupDateReminderScheduler {

    private final PopupRepository popupRepository;
    private final NoticeService noticeService;

    // 매일 오전 9시 실행
    //@Scheduled(fixedRate = 30000)
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDateReminders() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        List<Popup> openingTomorrow = popupRepository.findByStartDateOnDate(tomorrow);
        for (Popup popup : openingTomorrow) {
            noticeService.sendOpenReminder(popup);
        }

        List<Popup> closingTomorrow = popupRepository.findByEndDateOnDate(tomorrow);
        for (Popup popup : closingTomorrow) {
            noticeService.sendCloseReminder(popup);
        }

        log.info("팝업 오픈/종료 임박 알림 체크 완료 - 오픈예정 {}건, 종료예정 {}건", openingTomorrow.size(), closingTomorrow.size());
    }
}