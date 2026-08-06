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

            reservation.setSlot(slot);
            reservation.setReservationDate(slot.getSlotDate());

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

    private ReservationDetailResponse doCheckin(Reservation reservation, String requesterEmail) {
        if (reservation.getEntryStatus() == EntryStatus.CHECKED_IN) {
            throw new IllegalArgumentException("이미 입장 처리된 예약입니다.");
        }

        reservation.setEntryStatus(EntryStatus.CHECKED_IN);
        reservation.setCheckedInAt(LocalDateTime.now());
        reservation.setCheckedInBy(requesterEmail);
        transactionEventLogService.log(reservation.getPopup().getId(), "RESERVATION", reservation.getId(),
                "CHECKED_IN", requesterEmail, null);

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
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