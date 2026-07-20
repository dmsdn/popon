package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.business.Business;
import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
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

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final PopupRepository popupRepository;
    private final PopupSlotRepository popupSlotRepository;
    private final CustomerRepository customerRepository;
    private final BusinessRepository businessRepository;

    public ReservationResponse create(Long customerId, ReservationCreateRequest request) {
        Popup popup = popupRepository.findById(request.getPopupId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        Reservation reservation = new Reservation();
        reservation.setPopup(popup);
        reservation.setCustomer(customer);
        reservation.setPartySize(request.getPartySize());
        // 결제 시스템 없이 예약과 동시에 확정 처리
        reservation.setStatus(ReservationStatus.CONFIRMED);

        reservation.setQrToken(java.util.UUID.randomUUID().toString());
        reservation.setEntryStatus(EntryStatus.PENDING);

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

            reservation.setSlot(slot);
            reservation.setReservationDate(slot.getSlotDate());

        } else { // FREE 모드
            if (request.getReservationDate() == null) {
                throw new IllegalArgumentException("당일 방문 팝업입니다. reservationDate를 입력해주세요.");
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

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }

    // QR 스캔으로 입장확인 (주최자/관리자)
    public ReservationDetailResponse checkinByQr(String qrToken, String requesterEmail, boolean isAdmin) {
        Reservation reservation = reservationRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 QR 코드입니다."));

        validateCheckinPermission(reservation, requesterEmail, isAdmin);
        return doCheckin(reservation, requesterEmail);
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

        return ReservationDetailResponse.from(reservationRepository.save(reservation));
    }
}