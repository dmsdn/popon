package popupteam.popupbackend.domain.notice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.reservation.ReservationStatus;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 알림 #3: "예약 시간이 다 되어갈 때" 알림. 기존엔 관련 스케줄러/로직이 아예 없었음.
 * FREE 모드(reservationTime 직접 지정)와 SLOT 모드(slot.startTime 기준) 둘 다 체크.
 * 아직 체크인 안 한(PENDING) 예약만 대상 - 이미 입장했으면 임박 알림이 의미 없음.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ReservationTimeReminderScheduler {

    private static final int REMINDER_MINUTES_BEFORE = 30; // 시작 30분 전에 알림
    private static final int WINDOW_MINUTES = 10;           // 이 실행 주기(10분) 안에서만 걸리도록 하는 여유폭

    private final ReservationRepository reservationRepository;
    private final NoticeService noticeService;

    // 10분마다 실행 - 너무 잦으면 부담, 너무 뜸하면 "임박" 타이밍을 놓침
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void sendTimeReminders() {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        int sent = 0;

        List<Reservation> freeModeToday = reservationRepository.findFreeModeUpcomingToday(today, ReservationStatus.CONFIRMED);
        for (Reservation r : freeModeToday) {
            sent += notifyIfApproaching(r, LocalDateTime.of(today, r.getReservationTime()), now);
        }

        List<Reservation> slotModeToday = reservationRepository.findSlotModeUpcomingToday(today, ReservationStatus.CONFIRMED);
        for (Reservation r : slotModeToday) {
            LocalTime slotStart = r.getSlot().getStartTime();
            sent += notifyIfApproaching(r, LocalDateTime.of(today, slotStart), now);
        }

        if (sent > 0) {
            log.info("예약 시간 임박 알림 발송 완료 - {}건", sent);
        }
    }

    private int notifyIfApproaching(Reservation r, LocalDateTime startAt, LocalDateTime now) {
        if (r.getTimeReminderSentAt() != null) return 0; // 이미 보냄
        if (r.getCustomer() == null) return 0;
        if (Boolean.FALSE.equals(r.getCustomer().getReservationWaitingAgreed())) return 0;

        long minutesUntilStart = Duration.between(now, startAt).toMinutes();
        // "30분 전" 시점부터 스케줄러 실행 주기(10분) 폭 안에 들어왔을 때 한 번만 발송
        if (minutesUntilStart > REMINDER_MINUTES_BEFORE || minutesUntilStart < REMINDER_MINUTES_BEFORE - WINDOW_MINUTES) {
            return 0;
        }

        noticeService.notifyReservationTimeApproaching(r, (int) minutesUntilStart);
        r.setTimeReminderSentAt(now);
        reservationRepository.save(r);
        return 1;
    }
}