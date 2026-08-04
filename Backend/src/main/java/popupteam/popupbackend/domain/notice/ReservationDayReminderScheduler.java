package popupteam.popupbackend.domain.notice;
 
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.reservation.ReservationStatus;
 
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
 
/**
 * 알림 #2: "예약한 날짜가 오늘" 개인화 알림.
 * PopupDateReminderScheduler의 sendOpenReminder("팝업이 내일 오픈")와는 다른 알림 -
 * 이건 각 소비자의 예약 날짜 그 자체가 오늘인지를 본다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReservationDayReminderScheduler {
 
    private final ReservationRepository reservationRepository;
    private final NoticeService noticeService;
 
    // 매일 오전 9시 실행 (PopupDateReminderScheduler와 동일 시각)
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendDayReminders() {
        LocalDate today = LocalDate.now();
        List<Reservation> todayReservations = reservationRepository
                .findByReservationDateAndStatus(today, ReservationStatus.CONFIRMED);
 
        int sent = 0;
        for (Reservation r : todayReservations) {
            if (r.getDayReminderSentAt() != null) continue; // 이미 보냄 (중복 방지)
            if (r.getCustomer() == null) continue;
            if (Boolean.FALSE.equals(r.getCustomer().getReservationWaitingAgreed())) continue; // 알림 수신 거부
 
            noticeService.notifyReservationDayArrived(r);
            r.setDayReminderSentAt(LocalDateTime.now());
            reservationRepository.save(r);
            sent++;
        }
 
        if (sent > 0) {
            log.info("예약 당일 알림 발송 완료 - {}건", sent);
        }
    }
}