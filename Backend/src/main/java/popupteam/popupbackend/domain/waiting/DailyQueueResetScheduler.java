package popupteam.popupbackend.domain.waiting;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import popupteam.popupbackend.domain.eventlog.TransactionEventLogService;
import popupteam.popupbackend.domain.reservation.EntryStatus;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 자정 대기열 리셋 (8/4 신설).
 *
 * <p><b>왜 이 방식인가</b> — 원래는 「직원이 손님을 호출하면 15분 안에 안 오면 자동 취소」하는
 * WaitingAutoCancelScheduler가 있었다. 그런데 호출 기능이 기획에서 폐지되며 화면에서 버튼이
 * 빠졌고, CALLED 상태를 만드는 경로가 사라져 그 스케줄러는 한 번도 동작하지 못했다
 * (AUTO_CANCELLED 이벤트 0건). 그 결과 처리되지 않은 대기가 며칠씩 보드에 쌓였다.
 *
 * <p>분 단위로 손님을 자동 취소하는 것은 플랫폼이 현장 운영에 과하게 개입하는 일이다.
 * 대신 <b>하루가 끝나면 장부를 덮는다</b> — 그날 안에 직원이 입장·노쇼·취소로 처리하지 않고
 * 남긴 건은 자정에 「미입장」으로 확정되고, 다음 날 대기열은 0에서 시작한다.
 * 정리 책임은 현장 직원에게 두되, 방치된 건이 다음 날로 넘어가지는 않게 하는 최소 개입이다.
 *
 * <p><b>기록은 지우지 않는다</b> — 상태만 바꾸고 행은 그대로 둔다. 관제 화면에서 날짜를
 * 거슬러 고르면 그날 명단을 처리 결과까지 그대로 다시 볼 수 있다(UnifiedQueueService.getBoard).
 *
 * <p>서버 타임존이 KST(Asia/Seoul)이므로 zone을 명시해 UTC 환경으로 옮겨져도 한국 자정에 돈다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailyQueueResetScheduler {

    /** 자정 리셋으로 넘어간 건임을 남기는 사유. 손님·직원이 직접 누른 취소(null)와 구분한다. */
    public static final String REASON_NO_SHOW = "미입장";

    private final WaitingQueueRepository waitingQueueRepository;
    private final ReservationRepository reservationRepository;
    private final TransactionEventLogService transactionEventLogService;

    // 매일 00:05 KST — 자정 직후 몇 분은 남겨 둔다. 23:59에 접수한 손님을 곧바로 미입장으로
    // 넘기면 현장에서 억울한 케이스가 생긴다.
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void resetYesterdayQueue() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDateTime dayStart = yesterday.atStartOfDay();
        LocalDateTime dayEnd = yesterday.plusDays(1).atStartOfDay();

        // ① 현장 웨이팅 — 대기중 그대로 남은 건. 상태값을 늘리지 않고 CANCELLED + 사유로 구분한다.
        List<WaitingQueue> staleWaiting =
                waitingQueueRepository.findUnprocessedOfDay(WaitingStatus.WAITING, dayStart, dayEnd);
        for (WaitingQueue w : staleWaiting) {
            w.setStatus(WaitingStatus.CANCELLED);
            w.setCancelReason(REASON_NO_SHOW);
            transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(),
                    "AUTO_NO_SHOW", "system", "자정 대기열 리셋 — " + REASON_NO_SHOW);
        }
        if (!staleWaiting.isEmpty()) {
            waitingQueueRepository.saveAll(staleWaiting);
        }

        // ② 사전예약 — 입장·노쇼 처리 없이 남은 건. 예약 자체(status=CONFIRMED)는 건드리지 않고
        //    입장 여부만 NO_SHOW로 확정한다. 예약 건수 통계가 취소로 깎이면 안 되기 때문이다.
        List<Reservation> staleReservations = reservationRepository.findUnprocessedOfDay(yesterday);
        for (Reservation r : staleReservations) {
            r.setEntryStatus(EntryStatus.NO_SHOW);
            transactionEventLogService.log(r.getPopup().getId(), "RESERVATION", r.getId(),
                    "AUTO_NO_SHOW", "system", "자정 대기열 리셋 — " + REASON_NO_SHOW);
        }
        if (!staleReservations.isEmpty()) {
            reservationRepository.saveAll(staleReservations);
        }

        if (!staleWaiting.isEmpty() || !staleReservations.isEmpty()) {
            log.info("자정 대기열 리셋({}) — 웨이팅 {}건, 예약 {}건을 미입장 처리",
                    yesterday, staleWaiting.size(), staleReservations.size());
        }
    }
}
