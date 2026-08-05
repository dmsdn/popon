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

    /** 이벤트 로그에 남기는 사유 문구 (상태는 NO_SHOW enum으로 구분하므로 로그 전용) */
    public static final String REASON_NO_SHOW = "미입장";

    private final WaitingQueueRepository waitingQueueRepository;
    private final ReservationRepository reservationRepository;
    private final TransactionEventLogService transactionEventLogService;

    // 매일 00:05 KST — 자정 직후 몇 분은 남겨 둔다. 23:59에 접수한 손님을 곧바로 미입장으로
    // 넘기면 현장에서 억울한 케이스가 생긴다.
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void resetYesterdayQueue() {
        // [수정 8/6] 대상을 「어제 하루」에서 「오늘 이전 전부」로 넓혔다.
        //
        // 어제만 닫으면 리셋을 한 번이라도 거른 날짜가 영영 열린 채로 남는다. 배포 중 재기동,
        // 서버 정지, 스케줄러 도입(8/4) 이전 데이터가 전부 여기 해당한다.
        // 실제로 8/6 아침 기준 7/21~8/3에 걸쳐 20개 팝업에 33건이 열린 채 남아 있었고,
        // 그게 현장 태블릿의 대기 팀 수를 부풀렸다.
        //
        // 밀린 날짜를 한 번에 닫아도 부작용은 없다. 어차피 상태만 바꾸고 행은 남기며,
        // 정상 운영 중이라면 매일 어제치만 걸려 기존과 동일하게 동작한다.
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDateTime dayStart = LocalDateTime.of(1970, 1, 1, 0, 0);
        LocalDateTime dayEnd = today.atStartOfDay();

        // ① 현장 웨이팅 — 대기중(WAITING) 또는 호출만 받고 끝난(CALLED) 건.
        //    예약의 EntryStatus.NO_SHOW와 같은 사건이므로 같은 상태값(NO_SHOW)으로 확정한다.
        //    (CANCELLED+사유 문자열로 구분하던 우회는 8/4 당일 폐기)
        //    CALLED가 대상에 포함돼야 호출 기능(8/4 저녁 부활)이 대기열 리셋에 구멍을 내지 않는다.
        List<WaitingQueue> staleWaiting = waitingQueueRepository.findUnprocessedOfDay(
                List.of(WaitingStatus.WAITING, WaitingStatus.CALLED), dayStart, dayEnd);
        for (WaitingQueue w : staleWaiting) {
            w.setStatus(WaitingStatus.NO_SHOW);
            transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(),
                    "AUTO_NO_SHOW", "system", "자정 대기열 리셋 — " + REASON_NO_SHOW);
        }
        if (!staleWaiting.isEmpty()) {
            waitingQueueRepository.saveAll(staleWaiting);
        }

        // ② 사전예약 — 입장·노쇼 처리 없이 남은 건. 예약 자체(status=CONFIRMED)는 건드리지 않고
        //    입장 여부만 NO_SHOW로 확정한다. 예약 건수 통계가 취소로 깎이면 안 되기 때문이다.
        List<Reservation> staleReservations = reservationRepository.findUnprocessedBefore(today);
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
