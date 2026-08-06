package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.consumer.CustomerAccountRepository;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.popup.PopupSlot;
import popupteam.popupbackend.domain.popup.PopupSlotRepository;
import popupteam.popupbackend.domain.popup.ReservationMode;
import popupteam.popupbackend.domain.reservation.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PopupRepository popupRepository;
    private final PopupSlotRepository popupSlotRepository;
    private final CustomerAccountRepository customerRepository;
    private final BusinessRepository businessRepository;
    private final popupteam.popupbackend.domain.popup.PopupOperatingHoursRepository popupOperatingHoursRepository;
    private final popupteam.popupbackend.domain.eventlog.TransactionEventLogService transactionEventLogService;
    private final popupteam.popupbackend.domain.notice.NoticeService noticeService;
    private final popupteam.popupbackend.common.notification.EmailNotificationService emailNotificationService;
    private final popupteam.popupbackend.common.notification.SmsNotificationService smsNotificationService;

    @org.springframework.beans.factory.annotation.Value("${app.qr-base-url}")
    private String qrBaseUrl;

    // 그 날짜의 요일이 이 팝업의 휴무일로 설정되어 있는지 확인 (설정 자체가 없는 요일은 휴무 아님으로 간주)
    private void validateNotClosedDay(Long popupId, LocalDate date) {
        popupOperatingHoursRepository.findByPopupIdAndDayOfWeek(popupId, date.getDayOfWeek())
                .filter(popupteam.popupbackend.domain.popup.PopupOperatingHours::isClosed)
                .ifPresent(h -> {
                    throw new IllegalArgumentException("휴무일에는 예약할 수 없습니다.");
                });
    }

    // 버그 수정: FREE(당일 방문) 모드는 슬롯이 없어서, 팝업 등록 시 요일별로 설정한 운영시간
    // (open_time~close_time)을 전혀 검증하지 않고 있었음 - 오후 5시까지로 등록해도 19:30 같은
    // 시간이 그대로 예약되던 원인. 시간이 함께 들어온 경우에만 그 요일의 운영시간 범위를 확인한다.
    private void validateWithinOperatingHours(Long popupId, LocalDate date, LocalTime time) {
        if (time == null) {
            return;
        }
        popupOperatingHoursRepository.findByPopupIdAndDayOfWeek(popupId, date.getDayOfWeek())
                .ifPresent(h -> {
                    if (h.isClosed()) {
                        return; // validateNotClosedDay가 별도로 처리
                    }
                    if (h.getOpenTime() != null && time.isBefore(h.getOpenTime())) {
                        throw new IllegalArgumentException("운영 시작 시간(" + h.getOpenTime() + ") 이전에는 예약할 수 없습니다.");
                    }
                    if (h.getCloseTime() != null && time.isAfter(h.getCloseTime())) {
                        throw new IllegalArgumentException("운영 종료 시간(" + h.getCloseTime() + ") 이후에는 예약할 수 없습니다.");
                    }
                });
    }

    public ReservationResponse create(Long customerId, ReservationCreateRequest request) {
        Popup popup = popupRepository.findById(request.getPopupId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        if (popup.getMaxPartySizePerTeam() != null && request.getPartySize() > popup.getMaxPartySizePerTeam()) {
            throw new IllegalArgumentException(
                    "팀당 최대 인원은 " + popup.getMaxPartySizePerTeam() + "명입니다. 입력하신 인원(" + request.getPartySize() + "명)이 초과되었습니다.");
        }

        Reservation reservation = new Reservation();
        reservation.setPopup(popup);
        reservation.setCustomer(customer);
        reservation.setPartySize(request.getPartySize());
        // 결제 시스템 없이 예약과 동시에 확정 처리
        reservation.setStatus(ReservationStatus.CONFIRMED);

        reservation.setQrToken(java.util.UUID.randomUUID().toString());
        reservation.setEntryStatus(EntryStatus.PENDING);

        reservation.setSlot(null);
        reservation.setReservationDate(request.getReservationDate());
        reservation.setReservationTime(request.getReservationTime());

        if (popup.getReservationMode() == ReservationMode.SLOT) {
            if (request.getSlotId() == null) {
                throw new IllegalArgumentException("시간대 예약 팝업입니다. slotId를 입력해주세요.");
            }
            PopupSlot slot = popupSlotRepository.findById(request.getSlotId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 시간대입니다."));

            if (!slot.getPopup().getId().equals(popup.getId())) {
                throw new IllegalArgumentException("해당 팝업의 시간대가 아닙니다.");
            }

            int reserved = reservationRepository.findBySlotIdAndStatus(slot.getId(), ReservationStatus.CONFIRMED).stream()
                    .mapToInt(Reservation::getPartySize)
                    .sum();

            if (reserved + request.getPartySize() > slot.getCapacity()) {
                throw new IllegalArgumentException("정원이 초과되어 예약할 수 없습니다. 남은 자리: " + (slot.getCapacity() - reserved));
            }

            if (LocalDateTime.of(slot.getSlotDate(), slot.getStartTime()).isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("이미 지난 시간대는 예약할 수 없습니다.");
            }
            validateNotClosedDay(popup.getId(), slot.getSlotDate());

            // [수정 8/6] 같은 손님이 같은 회차를 두 번 잡는 것을 서버에서 막는다.
            if (reservationRepository.existsByCustomer_IdAndSlot_IdAndStatus(
                    customerId, slot.getId(), ReservationStatus.CONFIRMED)) {
                throw new IllegalArgumentException("이미 이 시간대에 예약이 있습니다.");
            }

            reservation.setSlot(slot);
            reservation.setReservationDate(slot.getSlotDate());
            // [수정 8/6] 회차 예약인데 reservationTime을 비워 두고 있었다(실측 189건 NULL).
            // 소비자 앱은 「같은 날짜 + 같은 시간」으로 중복을 판정하는데, 시간이 늘 null이라
            // null == null이 항상 참이 되어 검사가 「같은 날짜」로 퇴화했다. 그래서 같은 날
            // 다른 회차를 잡으려 해도 「이미 같은 시간대에 예약이 있어요」가 떴다.
            reservation.setReservationTime(slot.getStartTime());

        } else { // FREE 모드
            if (request.getReservationDate() == null) {
                throw new IllegalArgumentException("당일 방문 팝업입니다. reservationDate를 입력해주세요.");
            }

            if (request.getReservationTime() != null
                    && LocalDateTime.of(request.getReservationDate(), request.getReservationTime()).isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("이미 지난 시간은 예약할 수 없습니다.");
            } else if (request.getReservationTime() == null
                    && request.getReservationDate().isBefore(LocalDate.now())) {
                throw new IllegalArgumentException("이미 지난 날짜는 예약할 수 없습니다.");
            }
            validateNotClosedDay(popup.getId(), request.getReservationDate());
            validateWithinOperatingHours(popup.getId(), request.getReservationDate(), request.getReservationTime());

            // [수정 8/6] SLOT 모드와 같은 이유로 서버에서 중복을 막는다.
            // 시간을 안 고르는 팝업(reservationTime = null)은 하루에 한 번으로 본다.
            if (reservationRepository.existsSameFreeReservation(
                    customerId, popup.getId(), request.getReservationDate(),
                    request.getReservationTime(), ReservationStatus.CONFIRMED)) {
                throw new IllegalArgumentException("이미 이 시간대에 예약이 있습니다.");
            }

            int reserved = reservationRepository.findByPopupIdAndReservationDateAndStatus(
                            popup.getId(), request.getReservationDate(), ReservationStatus.CONFIRMED).stream()
                    .mapToInt(Reservation::getPartySize)
                    .sum();

            if (reserved + request.getPartySize() > popup.getCapacity()) {
                throw new IllegalArgumentException("정원이 초과되어 예약할 수 없습니다. 남은 자리: " + (popup.getCapacity() - reserved));
            }

            reservation.setSlot(null);
            reservation.setReservationDate(request.getReservationDate());
        }

        Reservation saved = reservationRepository.save(reservation);

        // 알림 #1: 예약 완료 시 알림이 아예 없었던 부분 - 인앱 알림함 + QR 이메일/SMS 발송.
        // 웨이팅은 이미 QR을 이메일/SMS로 보내고 있었는데 예약은 그조차 없었음.
        noticeService.notifyReservationCreated(saved);
        if (Boolean.TRUE.equals(customer.getReservationWaitingAgreed())) {
            String qrMessage = "팝업스토어 입장 QR: " + qrBaseUrl + "/qr/" + saved.getQrToken();
            emailNotificationService.sendQrCode(customer.getEmail(), "팝업스토어 예약 입장 QR 코드", qrMessage);
            smsNotificationService.sendQrCode(customer.getPhone(), qrMessage);
        }

        return ReservationResponse.from(saved);
    }

    // 예약 변경 (다른 슬롯/날짜로), 소비자 본인만 가능
    public ReservationResponse change(Long reservationId, Long customerId, ReservationChangeRequest request) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        if (!reservation.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("본인의 예약만 변경할 수 있습니다.");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("취소된 예약은 변경할 수 없습니다.");
        }

        if (reservation.getEntryStatus() != EntryStatus.PENDING) {
            throw new IllegalArgumentException("입장 처리 전 예약만 변경할 수 있습니다.");
        }

        Popup popup = reservation.getPopup();
        int newPartySize = (request.getPartySize() != null) ? request.getPartySize() : reservation.getPartySize();
        if (newPartySize < 1) {
            throw new IllegalArgumentException("인원수는 1명 이상이어야 합니다.");
        }
        if (popup.getMaxPartySizePerTeam() != null && newPartySize > popup.getMaxPartySizePerTeam()) {
            throw new IllegalArgumentException(
                    "팀당 최대 인원은 " + popup.getMaxPartySizePerTeam() + "명입니다. 입력하신 인원(" + newPartySize + "명)이 초과되었습니다.");
        }

        if (popup.getReservationMode() == ReservationMode.SLOT) {
            if (request.getNewSlotId() == null) {
                throw new IllegalArgumentException("시간대 예약 팝업입니다. newSlotId를 입력해주세요.");
            }
            PopupSlot newSlot = popupSlotRepository.findById(request.getNewSlotId())
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 시간대입니다."));

            if (!newSlot.getPopup().getId().equals(popup.getId())) {
                throw new IllegalArgumentException("해당 팝업의 시간대가 아닙니다.");
            }

            int reserved = reservationRepository.findBySlotIdAndStatus(newSlot.getId(), ReservationStatus.CONFIRMED).stream()
                    .filter(r -> !r.getId().equals(reservation.getId()))
                    .mapToInt(Reservation::getPartySize)
                    .sum();

            if (reserved + newPartySize > newSlot.getCapacity()) {
                throw new IllegalArgumentException("정원이 초과되어 변경할 수 없습니다. 남은 자리: " + (newSlot.getCapacity() - reserved));
            }

            if (LocalDateTime.of(newSlot.getSlotDate(), newSlot.getStartTime()).isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("이미 지난 시간대로는 변경할 수 없습니다.");
            }
            validateNotClosedDay(popup.getId(), newSlot.getSlotDate());

            reservation.setSlot(newSlot);
            reservation.setReservationDate(newSlot.getSlotDate());

        } else { // FREE 모드
            LocalDate newDate = (request.getNewReservationDate() != null)
                    ? request.getNewReservationDate() : reservation.getReservationDate();
            LocalTime newTime = (request.getNewReservationTime() != null)
                    ? request.getNewReservationTime() : reservation.getReservationTime();

            if (newTime != null && LocalDateTime.of(newDate, newTime).isBefore(LocalDateTime.now())) {
                throw new IllegalArgumentException("이미 지난 시간으로는 변경할 수 없습니다.");
            } else if (newTime == null && newDate.isBefore(LocalDate.now())) {
                throw new IllegalArgumentException("이미 지난 날짜로는 변경할 수 없습니다.");
            }
            validateNotClosedDay(popup.getId(), newDate);
            validateWithinOperatingHours(popup.getId(), newDate, newTime);

            int reserved = reservationRepository.findByPopupIdAndReservationDateAndStatus(
                            popup.getId(), newDate, ReservationStatus.CONFIRMED).stream()
                    .filter(r -> !r.getId().equals(reservation.getId()))
                    .mapToInt(Reservation::getPartySize)
                    .sum();

            if (reserved + newPartySize > popup.getCapacity()) {
                throw new IllegalArgumentException("정원이 초과되어 변경할 수 없습니다. 남은 자리: " + (popup.getCapacity() - reserved));
            }

            reservation.setReservationDate(newDate);
            if (request.getNewReservationTime() != null) {
                reservation.setReservationTime(request.getNewReservationTime());
            }
        }

        reservation.setPartySize(newPartySize);

        transactionEventLogService.log(popup.getId(), "RESERVATION", reservation.getId(),
                "CHANGED", "customer:" + customerId, null);

        return ReservationResponse.from(reservationRepository.save(reservation));
    }

    public List<ReservationResponse> findByCustomer(Long customerId) {
        return reservationRepository.findByCustomerId(customerId).stream()
                .map(ReservationResponse::from)
                .collect(Collectors.toList());
    }

    public List<ReservationDetailResponse> getByPopup(Long popupId) {
        return reservationRepository.findByPopupId(popupId).stream()
                .map(ReservationDetailResponse::from)
                .collect(Collectors.toList());
    }

    // 주최자/관리자가 예약 취소
    public ReservationDetailResponse cancel(Long reservationId, String requesterEmail, boolean isAdmin, String cancelReason) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        if (!isAdmin) {
            Business business = businessRepository.findByEmail(requesterEmail)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
            if (!reservation.getPopup().getBusiness().getId().equals(business.getId())) {
                throw new ForbiddenException("본인이 등록한 팝업의 예약만 취소할 수 있습니다.");
            }
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("이미 취소된 예약입니다.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason(cancelReason);
        reservation.setCancelledAt(LocalDateTime.now());
        transactionEventLogService.log(reservation.getPopup().getId(), "RESERVATION", reservation.getId(),
                "CANCELLED", requesterEmail, cancelReason);

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }

    // QR 스캔으로 입장확인 (주최자/관리자)
    // popupId: 지금 스캔 중인 화면(현장)이 속한 팝업 ID - 같은 주최자 소유 팝업이라도
    // QR이 다른 팝업 소속이면 거부하기 위한 필수 검증값
    public ReservationDetailResponse checkinByQr(String qrToken, Long popupId, String requesterEmail, boolean isAdmin) {
        Reservation reservation = reservationRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 QR 코드입니다."));

        validateQrCheckinPopup(reservation, popupId);
        validateCheckinPermission(reservation, requesterEmail, isAdmin);
        return doCheckin(reservation, requesterEmail);
    }

    // 팝업 단위 검증 - QR 스캔 전용. 수동 체크인/노쇼 처리는 이미 특정 팝업의 예약 명단 화면에서
    // reservationId로 선택해서 호출하는 구조라 팝업 혼동 위험이 없어 대상 아님
    private void validateQrCheckinPopup(Reservation reservation, Long popupId) {
        if (!reservation.getPopup().getId().equals(popupId)) {
            throw new ForbiddenException("다른 팝업의 QR 코드는 사용할 수 없습니다.");
        }
    }

    // 수동 입장확인 (QR 인식 안 될 때 대비)
    public ReservationDetailResponse checkinManual(Long reservationId, String requesterEmail, boolean isAdmin) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        validateCheckinPermission(reservation, requesterEmail, isAdmin);
        return doCheckin(reservation, requesterEmail);
    }

    // 노쇼 처리
    public ReservationDetailResponse markNoShow(Long reservationId, String requesterEmail, boolean isAdmin) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        validateCheckinPermission(reservation, requesterEmail, isAdmin);

        if (reservation.getEntryStatus() == EntryStatus.CHECKED_IN) {
            throw new IllegalArgumentException("이미 입장 처리된 예약은 노쇼로 변경할 수 없습니다.");
        }

        reservation.setEntryStatus(EntryStatus.NO_SHOW);
        transactionEventLogService.log(reservation.getPopup().getId(), "RESERVATION", reservation.getId(),
                "NO_SHOW", requesterEmail, null);

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }

    private void validateCheckinPermission(Reservation reservation, String requesterEmail, boolean isAdmin) {
        if (!isAdmin) {
            Business business = businessRepository.findByEmail(requesterEmail)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사업자입니다."));
            if (!reservation.getPopup().getBusiness().getId().equals(business.getId())) {
                throw new ForbiddenException("본인이 등록한 팝업의 예약만 처리할 수 있습니다.");
            }
        }
        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("취소된 예약은 처리할 수 없습니다.");
        }
    }

    // 회차 시작 몇 분 전부터 입장을 받아 줄 것인가.
    // 0으로 두면 정각 전에는 아무도 못 들어와 문 앞에서 시계를 보고 있어야 하고,
    // 회차 간격(30분)만큼 열어 두면 앞 회차와 정원이 통째로 겹친다. 그 사이를 잡았다.
    private static final int CHECKIN_GRACE_MINUTES = 10;

    private ReservationDetailResponse doCheckin(Reservation reservation, String requesterEmail) {
        if (reservation.getEntryStatus() == EntryStatus.CHECKED_IN) {
            throw new IllegalArgumentException("이미 입장 처리된 예약입니다.");
        }
        // [신규 8/6] 여기에 날짜·시각 검증이 하나도 없었다. 스캔만 되면 언제든 입장으로 찍혔다.
        // 실제로 08:00 회차 예약이 07:33에 입장 처리된 건이 나왔다.
        validateCheckinTiming(reservation);

        reservation.setEntryStatus(EntryStatus.CHECKED_IN);
        reservation.setCheckedInAt(LocalDateTime.now());
        reservation.setCheckedInBy(requesterEmail);
        transactionEventLogService.log(reservation.getPopup().getId(), "RESERVATION", reservation.getId(),
                "CHECKED_IN", requesterEmail, null);

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }

    /**
     * 입장 처리 가능한 시점인지 확인한다 (8/6 신설).
     *
     * <p>세 가지를 막는다.
     * <ul>
     *   <li><b>다른 날짜의 예약</b> — 내일 예약 QR을 오늘 들고 와 찍어도 통과했다. 통과하면
     *       방문자 통계에 잡히고 후기에 「방문자」 배지까지 붙는다.</li>
     *   <li><b>이미 미입장으로 닫힌 예약</b> — 자정 리셋이 NO_SHOW로 확정한 어제 건이 오늘
     *       스캔 한 번에 입장으로 되살아났다. 확정된 어제 장부를 소급해 고치는 셈이다.
     *       현장 웨이팅 쪽(enterByQr)은 이미 NO_SHOW를 거부하고 있어 예약만 비대칭으로 뚫려 있었다.</li>
     *   <li><b>회차 시작 한참 전</b> — 회차 예약의 목적은 동시 수용 정원을 나누는 것인데,
     *       앞당겨 들어오면 앞 회차와 겹쳐 그 목적이 무너진다.</li>
     * </ul>
     */
    private void validateCheckinTiming(Reservation reservation) {
        if (reservation.getEntryStatus() == EntryStatus.NO_SHOW) {
            throw new IllegalArgumentException("미입장으로 확정된 예약입니다. 현장에서 새로 웨이팅을 등록해 주세요.");
        }

        LocalDate date = reservation.getSlot() != null
                ? reservation.getSlot().getSlotDate()
                : reservation.getReservationDate();
        if (date == null) return;   // 날짜 없는 예약은 옛 데이터뿐이라 막지 않는다

        LocalDate today = LocalDate.now();
        if (!date.isEqual(today)) {
            throw new IllegalArgumentException("오늘 예약이 아닙니다. (예약일 " + date + ")");
        }

        java.time.LocalTime start = reservation.getSlot() != null
                ? reservation.getSlot().getStartTime()
                : reservation.getReservationTime();
        if (start == null) return;  // 시간을 안 고르는 팝업은 당일이기만 하면 통과

        LocalDateTime openAt = LocalDateTime.of(date, start).minusMinutes(CHECKIN_GRACE_MINUTES);
        if (LocalDateTime.now().isBefore(openAt)) {
            throw new IllegalArgumentException(
                    "아직 입장 시간이 아닙니다. " + start + " 회차는 "
                            + CHECKIN_GRACE_MINUTES + "분 전부터 입장할 수 있습니다.");
        }
    }

    // 소비자 본인이 예약 취소
    public ReservationDetailResponse cancelByCustomer(Long reservationId, Long customerId, String cancelReason) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 예약입니다."));

        if (reservation.getCustomer() == null || !reservation.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("본인의 예약만 취소할 수 있습니다.");
        }

        if (reservation.getStatus() == ReservationStatus.CANCELLED) {
            throw new IllegalArgumentException("이미 취소된 예약입니다.");
        }

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason(cancelReason);
        reservation.setCancelledAt(LocalDateTime.now());
        transactionEventLogService.log(reservation.getPopup().getId(), "RESERVATION", reservation.getId(),
                "CANCELLED", "customer:" + customerId, cancelReason);

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }
}