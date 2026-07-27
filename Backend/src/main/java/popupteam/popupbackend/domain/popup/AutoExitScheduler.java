package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.reservation.EntryStatus;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import popupteam.popupbackend.domain.waiting.WaitingStatus;
import popupteam.popupbackend.domain.eventlog.TransactionEventLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AutoExitScheduler {

    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;
    private final TransactionEventLogService transactionEventLogService;

    // 1분마다 체크: 체크인/입장 후 그 팝업의 평균체험시간이 지났는데 아직 퇴장 안 된 사람 자동 퇴장 처리
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void autoExitExpired() {
        LocalDateTime now = LocalDateTime.now();
        int reservationCount = 0;
        int waitingCount = 0;

        // 예약(사전예약) 체크인자
        List<Reservation> checkedInReservations = reservationRepository
                .findByEntryStatusAndExitedAtIsNull(EntryStatus.CHECKED_IN);

        for (Reservation r : checkedInReservations) {
            if (r.getCheckedInAt() == null) continue;

            int avgMinutes = r.getPopup().getAvgExperienceMinutes();
            LocalDateTime dueTime = r.getCheckedInAt().plusMinutes(avgMinutes);

            if (dueTime.isBefore(now)) {
                r.setExitedAt(now);
                transactionEventLogService.log(r.getPopup().getId(), "RESERVATION", r.getId(),
                        "AUTO_EXITED", "system", "평균체험시간(" + avgMinutes + "분) 경과 자동퇴장");
                reservationCount++;
            }
        }
        if (reservationCount > 0) {
            reservationRepository.saveAll(checkedInReservations);
        }

        // 현장웨이팅 입장자
        List<WaitingQueue> enteredWaiting = waitingQueueRepository
                .findByStatusAndExitedAtIsNull(WaitingStatus.ENTERED);

        for (WaitingQueue w : enteredWaiting) {
            if (w.getEnteredAt() == null) continue;

            int avgMinutes = w.getPopup().getAvgExperienceMinutes();
            LocalDateTime dueTime = w.getEnteredAt().plusMinutes(avgMinutes);

            if (dueTime.isBefore(now)) {
                w.setExitedAt(now);
                transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(),
                        "AUTO_EXITED", "system", "평균체험시간(" + avgMinutes + "분) 경과 자동퇴장");
                waitingCount++;
            }
        }
        if (waitingCount > 0) {
            waitingQueueRepository.saveAll(enteredWaiting);
        }

        if (reservationCount > 0 || waitingCount > 0) {
            log.info("자동퇴장 처리 완료 - 예약 {}건, 웨이팅 {}건", reservationCount, waitingCount);
        }
    }
}