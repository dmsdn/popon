package popupteam.popupbackend.domain.waiting;

import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.waiting.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WaitingQueueService {

    private final WaitingQueueRepository waitingQueueRepository;
    private final PopupRepository popupRepository;
    private final CustomerRepository customerRepository;
    private final popupteam.popupbackend.common.notification.EmailNotificationService emailNotificationService;
    private final popupteam.popupbackend.common.notification.SmsNotificationService smsNotificationService;
    private final popupteam.popupbackend.domain.eventlog.TransactionEventLogService transactionEventLogService;


    // 현장 웨이팅 등록 (회원: customerId 있음 / 비회원: name+email 있음)
    public WaitingResponse register(Long popupId, Long customerId, WaitingCreateRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        Customer customer = null;
        if (customerId != null) {
            customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));
        } else {
            if (request.getName() == null || request.getName().isBlank()
                    || request.getEmail() == null || request.getEmail().isBlank()) {
                throw new IllegalArgumentException("비회원 웨이팅은 이름과 이메일이 필수입니다.");
            }
        }

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        int nextTeamNumber = waitingQueueRepository.findMaxTeamNumberToday(popupId, startOfDay) + 1;

        WaitingQueue waiting = new WaitingQueue();
        waiting.setPopup(popup);
        waiting.setCustomer(customer);
        waiting.setName(request.getName());
        waiting.setEmail(request.getEmail());
        waiting.setPhoneNumber(request.getPhoneNumber());
        waiting.setPartySize(request.getPartySize());
        waiting.setTeamNumber(nextTeamNumber);
        waiting.setQrToken(UUID.randomUUID().toString());

        WaitingQueue saved = waitingQueueRepository.save(waiting);
        long teamsAhead = waitingQueueRepository.countAheadOf(popupId, saved.getId());

        String qrMessage = "팝업스토어 입장 QR: https://your-domain.com/qr/" + saved.getQrToken();
        emailNotificationService.sendQrCode(saved.getEmail(), "팝업스토어 입장 QR 코드", qrMessage);
        smsNotificationService.sendQrCode(saved.getPhoneNumber(), qrMessage);
        return WaitingResponse.from(saved, teamsAhead);
    }

    // 패드 현황판: 현장웨이팅자만 (기존 방식 유지, 필요시 사용)
    public WaitingBoardResponse getBoard(Long popupId) {
        List<WaitingQueue> waitingList = waitingQueueRepository
                .findByPopupIdAndStatusOrderByRegisteredAtAsc(popupId, WaitingStatus.WAITING);

        List<WaitingResponse> responses = waitingList.stream()
                .map(w -> {
                    long ahead = waitingQueueRepository.countAheadOf(popupId, w.getId());
                    return WaitingResponse.from(w, ahead);
                })
                .collect(Collectors.toList());

        return WaitingBoardResponse.builder()
                .popupId(popupId)
                .totalWaitingTeams(responses.size())
                .waitingList(responses)
                .build();
    }

    public WaitingResponse getMyStatus(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));
        long ahead = w.getStatus() == WaitingStatus.WAITING
                ? waitingQueueRepository.countAheadOf(w.getPopup().getId(), w.getId())
                : 0;
        return WaitingResponse.from(w, ahead);
    }

    public WaitingResponse call(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        if (w.getStatus() != WaitingStatus.WAITING) {
            throw new IllegalArgumentException("대기중인 팀만 호출할 수 있습니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        w.setStatus(WaitingStatus.CALLED);
        w.setCalledAt(now);
        w.setCallExpiresAt(now.plusMinutes(15));
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "CALLED", "system", null);

        log.info("[카카오 알림 발송 대상] phone={}, teamNumber={}", w.getPhoneNumber(), w.getTeamNumber());

        return WaitingResponse.from(w, 0L);
    }

    public WaitingResponse enter(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        w.setStatus(WaitingStatus.ENTERED);
        w.setEnteredAt(LocalDateTime.now());
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "ENTERED", "system", null);

        return WaitingResponse.from(w, 0L);
    }

    // 통합 QR 체크인 (예약 QR / 현장웨이팅 QR 둘 다 시도)
    public WaitingResponse enterByQr(String qrToken) {
        WaitingQueue w = waitingQueueRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 QR 코드입니다."));

        if (w.getStatus() == WaitingStatus.ENTERED) {
            throw new IllegalArgumentException("이미 입장 처리된 대기입니다.");
        }
        if (w.getStatus() == WaitingStatus.CANCELLED) {
            throw new IllegalArgumentException("취소된 대기입니다.");
        }

        w.setStatus(WaitingStatus.ENTERED);
        w.setEnteredAt(LocalDateTime.now());
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "ENTERED", "qr_scan", null);

        return WaitingResponse.from(w, 0L);
    }

    public WaitingResponse cancel(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        w.setStatus(WaitingStatus.CANCELLED);
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "CANCELLED", "system", null);

        return WaitingResponse.from(w, 0L);
    }
}