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
    private final popupteam.popupbackend.domain.business.BusinessRepository businessRepository;
    private final popupteam.popupbackend.domain.popup.PopupOperatingHoursRepository popupOperatingHoursRepository;
    private final popupteam.popupbackend.domain.notice.NoticeService noticeService;

    @org.springframework.beans.factory.annotation.Value("${app.qr-base-url}")
    private String qrBaseUrl;


    // 현장 웨이팅 등록 (회원: customerId 있음 / 비회원: name+email 있음)
    public WaitingResponse register(Long popupId, Long customerId, WaitingCreateRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (popup.getMaxPartySizePerTeam() != null && request.getPartySize() > popup.getMaxPartySizePerTeam()) {
            throw new IllegalArgumentException(
                    "팀당 최대 인원은 " + popup.getMaxPartySizePerTeam() + "명입니다. 입력하신 인원(" + request.getPartySize() + "명)이 초과되었습니다.");
        }

        // 버그 수정: 현장웨이팅은 항상 "오늘" 기준으로 등록되는데, 오늘이 휴무일로 설정되어 있어도
        // 걸러내는 로직이 없어서 예약(사전예약)과 달리 그대로 등록되고 있었음.
        java.time.DayOfWeek today = LocalDate.now().getDayOfWeek();
        popupOperatingHoursRepository.findByPopupIdAndDayOfWeek(popupId, today)
                .filter(popupteam.popupbackend.domain.popup.PopupOperatingHours::isClosed)
                .ifPresent(h -> {
                    throw new IllegalArgumentException("오늘은 휴무일이라 웨이팅 등록을 할 수 없습니다.");
                });

        Customer customer = null;
        if (customerId != null) {
            customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

            boolean alreadyWaiting = waitingQueueRepository.existsByPopupIdAndCustomerIdAndStatusIn(
                    popupId, customerId, List.of(WaitingStatus.WAITING, WaitingStatus.CALLED));
            if (alreadyWaiting) {
                throw new IllegalArgumentException("이미 이 팝업에 웨이팅 등록이 되어 있습니다. 중복으로 등록할 수 없습니다.");
            }
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

        String qrMessage = "팝업스토어 입장 QR: " + qrBaseUrl + "/qr/" + saved.getQrToken();
        emailNotificationService.sendQrCode(saved.getEmail(), "팝업스토어 입장 QR 코드", qrMessage);
        smsNotificationService.sendQrCode(saved.getPhoneNumber(), qrMessage);

        // 알림 #4 나머지 절반: 이메일/SMS는 이미 있었는데 인앱 알림함(Notice)엔 안 쌓이고 있었음
        noticeService.notifyWaitingRegistered(saved);

        return WaitingResponse.from(saved, teamsAhead);
    }

    // 패드 현황판: 현장웨이팅자만 (기존 방식 유지, 필요시 사용)
    public WaitingBoardResponse getBoard(Long popupId) {
        List<WaitingQueue> waitingList = waitingQueueRepository
                .findByPopupIdAndStatusOrderByRegisteredAtAsc(popupId, WaitingStatus.WAITING);

        List<WaitingResponse> responses = new java.util.ArrayList<>();
        for (int i = 0; i < waitingList.size(); i++) {
            responses.add(WaitingResponse.from(waitingList.get(i), (long) i));
        }

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

    // QR 토큰으로 상태 조회 (7/31 신설 → 8/4 머지 유실 → 복구) — 손님의 /qr/{token} 화면이 폴링한다.
    // 인증 없이 열리므로 개인정보를 담지 않는 전용 DTO를 쓴다 (WaitingQrStatusResponse 주석 참고).
    public popupteam.popupbackend.domain.waiting.dto.WaitingQrStatusResponse getStatusByQr(String qrToken) {
        WaitingQueue w = waitingQueueRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 QR입니다."));
        long ahead = w.getStatus() == WaitingStatus.WAITING
                ? waitingQueueRepository.countAheadOf(w.getPopup().getId(), w.getId())
                : 0;
        return popupteam.popupbackend.domain.waiting.dto.WaitingQrStatusResponse.from(w, ahead);
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

        // 알림 #5 수정: 카카오 알림톡 연동 전이라 콘솔 로그만 찍고 실사용자에게는 아무것도 안 가던 부분.
        // 카카오 알림톡이 준비되기 전까지는 기존에 이미 연동되어 있는 이메일/SMS로 대체 발송하고,
        // 인앱 알림함에도 쌓아서 최소한 앱 안에서라도 "내 차례" 알림을 볼 수 있게 함.
        String callMessage = "[" + w.getPopup().getTitle() + "] 웨이팅 " + w.getTeamNumber()
                + "번, 지금 입장 차례입니다! 15분 내로 입장해주세요.";
        emailNotificationService.sendQrCode(w.getEmail(), "지금 입장해주세요 - 웨이팅 " + w.getTeamNumber() + "번", callMessage);
        smsNotificationService.sendQrCode(w.getPhoneNumber(), callMessage);
        noticeService.notifyWaitingCalled(w);

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

    // 현장웨이팅 QR 체크인
    // popupId: 지금 스캔 중인 화면(현장)이 속한 팝업 ID - 같은 주최자 소유 팝업이라도
    // QR이 다른 팝업 소속이면 거부하기 위한 필수 검증값
    public WaitingResponse enterByQr(String qrToken, Long popupId, String requesterEmail, boolean isAdmin) {
        WaitingQueue w = waitingQueueRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 QR 코드입니다."));

        // 1. 팝업 단위 검증 - 같은 주최자 소유 팝업이라도 "지금 스캔 중인 팝업"과 QR의 팝업이 다르면 무조건 거부
        if (!w.getPopup().getId().equals(popupId)) {
            throw new popupteam.popupbackend.common.exception.ForbiddenException("다른 팝업의 QR 코드는 사용할 수 없습니다.");
        }

        // 2. 소유권 검증 - 이 팝업이 실제로 요청자(주최자) 소유인지
        if (!isAdmin) {
            popupteam.popupbackend.domain.business.Business business = businessRepository.findByEmail(requesterEmail)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
            if (!w.getPopup().getBusiness().getId().equals(business.getId())) {
                throw new popupteam.popupbackend.common.exception.ForbiddenException("본인이 등록한 팝업의 웨이팅만 처리할 수 있습니다.");
            }
        }

        if (w.getStatus() == WaitingStatus.ENTERED) {
            throw new IllegalArgumentException("이미 입장 처리된 대기입니다.");
        }
        if (w.getStatus() == WaitingStatus.CANCELLED) {
            throw new IllegalArgumentException("취소된 대기입니다.");
        }
        if (w.getStatus() == WaitingStatus.NO_SHOW) {
            throw new IllegalArgumentException("미입장 처리된 대기입니다. 재방문 시 새로 웨이팅을 등록해 주세요.");
        }

        w.setStatus(WaitingStatus.ENTERED);
        w.setEnteredAt(LocalDateTime.now());
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "ENTERED", "qr_scan", null);

        return WaitingResponse.from(w, 0L);
    }

    // 주최자/관리자: 노쇼 처리 (8/4 신설). 예약의 markNoShow(EntryStatus.NO_SHOW)와 대칭 —
    // 「안 왔다」는 취소가 아니라 별도 상태다. 노쇼율 집계가 취소와 섞이지 않게 한다.
    public WaitingResponse noShow(Long waitingId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        if (w.getStatus() == WaitingStatus.ENTERED) {
            throw new IllegalArgumentException("이미 입장 처리된 대기는 노쇼로 바꿀 수 없습니다.");
        }
        w.setStatus(WaitingStatus.NO_SHOW);
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "NO_SHOW", "system", null);

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

    // 소비자 본인 웨이팅 취소 (비회원 웨이팅은 customer가 null이라 이 경로로 취소 불가 - 현장에서 직원이 취소해줘야 함)
    public WaitingResponse cancelByCustomer(Long waitingId, Long customerId) {
        WaitingQueue w = waitingQueueRepository.findById(waitingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 대기입니다."));

        if (w.getCustomer() == null || !w.getCustomer().getId().equals(customerId)) {
            throw new popupteam.popupbackend.common.exception.ForbiddenException("본인의 웨이팅만 취소할 수 있습니다.");
        }

        w.setStatus(WaitingStatus.CANCELLED);
        waitingQueueRepository.save(w);

        transactionEventLogService.log(w.getPopup().getId(), "WAITING", w.getId(), "CANCELLED", "customer:" + customerId, null);

        return WaitingResponse.from(w, 0L);
    }

    // 내 웨이팅 목록 (여러 팝업 통틀어, 현재 대기중/호출됨 상태만)
    public List<MyWaitingResponse> getMyActiveWaitings(Long customerId) {
        List<WaitingQueue> myWaitings = waitingQueueRepository
                .findByCustomerIdAndStatusInOrderByRegisteredAtDesc(customerId, List.of(WaitingStatus.WAITING, WaitingStatus.CALLED));

        return myWaitings.stream()
                .map(w -> MyWaitingResponse.builder()
                        .waitingId(w.getId())
                        .popupId(w.getPopup().getId())
                        .popupTitle(w.getPopup().getTitle())
                        .teamNumber(w.getTeamNumber())
                        .teamsAhead(waitingQueueRepository.countAheadOf(w.getPopup().getId(), w.getId()))
                        .status(w.getStatus().name())
                        .registeredAt(w.getRegisteredAt())
                        .build())
                .toList();
    }
}