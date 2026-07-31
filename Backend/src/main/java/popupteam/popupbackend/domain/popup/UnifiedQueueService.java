package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.*;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import popupteam.popupbackend.domain.waiting.WaitingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UnifiedQueueService {

    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;

    public UnifiedQueueBoardResponse getBoard(Long popupId) {
        List<UnifiedQueueEntryResponse> entries = new ArrayList<>();

        // 1. 사전예약자 중 슬롯시작(또는 당일)이 지난 사람들
        List<Reservation> arrived = reservationRepository
                .findArrivedPreReservations(popupId, LocalDateTime.now(), LocalDate.now());

        for (Reservation r : arrived) {
            LocalDateTime joinedAt = (r.getSlot() != null)
                    ? r.getSlot().getSlotDate().atTime(r.getSlot().getStartTime())
                    : r.getReservationDate().atStartOfDay();

            entries.add(UnifiedQueueEntryResponse.builder()
                    .source("RESERVATION")
                    .refId(r.getId())
                    .displayName(maskName(r.getCustomer().getNickname()))
                    .phoneNumber(null)
                    .partySize(r.getPartySize())
                    .qrToken(r.getQrToken())
                    .entryStatus(r.getEntryStatus().name())
                    .joinedAt(joinedAt)
                    .build());
        }

        // 2. 현장웨이팅자 (WAITING 또는 CALLED 상태만, 등록 순서대로)
        List<WaitingQueue> waitingList = waitingQueueRepository
                .findByPopupIdAndStatusOrderByRegisteredAtAsc(popupId, WaitingStatus.WAITING);

        for (WaitingQueue w : waitingList) {
            String displayName = (w.getCustomer() != null)
                    ? maskName(w.getCustomer().getNickname())
                    : maskName(w.getName());

            entries.add(UnifiedQueueEntryResponse.builder()
                    .source("ONSITE_WAITING")
                    .refId(w.getId())
                    .displayName(displayName)
                    .phoneNumber(w.getPhoneNumber())
                    .partySize(w.getPartySize())
                    .qrToken(w.getQrToken())
                    .entryStatus(w.getStatus().name())
                    .joinedAt(w.getRegisteredAt())
                    .build());
        }

        // 3. 현재 체류중(입장완료, 아직 퇴장 전) 예약자
        List<Reservation> insideReservations = reservationRepository.findCurrentlyInsideByPopupId(popupId);
        for (Reservation r : insideReservations) {
            entries.add(UnifiedQueueEntryResponse.builder()
                    .source("RESERVATION")
                    .refId(r.getId())
                    .displayName(maskName(r.getCustomer().getNickname()))
                    .phoneNumber(null)
                    .partySize(r.getPartySize())
                    .qrToken(r.getQrToken())
                    .entryStatus(r.getEntryStatus().name())
                    .joinedAt(r.getCheckedInAt())
                    .build());
        }

        // 4. 현재 체류중(입장완료, 아직 퇴장 전) 현장웨이팅자
        List<WaitingQueue> insideWaiting = waitingQueueRepository.findCurrentlyInsideByPopupId(popupId);
        for (WaitingQueue w : insideWaiting) {
            String displayName = (w.getCustomer() != null)
                    ? maskName(w.getCustomer().getNickname())
                    : maskName(w.getName());

            entries.add(UnifiedQueueEntryResponse.builder()
                    .source("ONSITE_WAITING")
                    .refId(w.getId())
                    .displayName(displayName)
                    .phoneNumber(w.getPhoneNumber())
                    .partySize(w.getPartySize())
                    .qrToken(w.getQrToken())
                    .entryStatus(w.getStatus().name())
                    .joinedAt(w.getEnteredAt())
                    .build());
        }

        // 5. 합류시각(joinedAt) 기준 정렬 — 사전예약자 먼저, 그 다음 현장웨이팅 순서 유지
        entries.sort((a, b) -> a.getJoinedAt().compareTo(b.getJoinedAt()));
        return UnifiedQueueBoardResponse.builder()
                .popupId(popupId)
                .totalCount(entries.size())
                .entries(entries)
                .build();


    }

    // 스캐너가 지금 열어 둔 팝업과 QR의 팝업이 같은지 확인한다 (7/31 추가).
    //
    // 그전 검사는 「이 QR의 팝업 주인이 요청자인가」뿐이었다. 주최자가 팝업을 여러 개 운영하면
    // 그 검사는 전부 통과하므로, A팝업 현장에서 B팝업 손님의 QR을 찍어도 입장 처리가 됐다.
    // 명단이 어긋나고 정원 집계가 틀어지는 실사고라 팝업 일치까지 본다.
    // scannerPopupId가 null이면(=popupId를 안 보내는 구버전 클라이언트) 검사하지 않는다.
    private static void assertSamePopup(Long scannerPopupId, Long qrPopupId) {
        if (scannerPopupId == null) return;
        if (!scannerPopupId.equals(qrPopupId)) {
            throw new IllegalArgumentException("다른 팝업의 QR 코드입니다. 현재 선택한 팝업의 QR만 처리할 수 있습니다.");
        }
    }

    // 통합 QR 체크인: 예약 QR 먼저 시도, 없으면 웨이팅 QR 시도
    // popupId = 스캐너 화면에서 선택 중인 팝업 (null이면 팝업 일치 검사 생략)
    public UnifiedQueueEntryResponse checkinByQr(String qrToken, Long popupId, String requesterEmail, boolean isAdmin) {
        var reservationOpt = reservationRepository.findByQrToken(qrToken);
        if (reservationOpt.isPresent()) {
            var r = reservationOpt.get();

            if (!isAdmin && !r.getPopup().getBusiness().getEmail().equals(requesterEmail)) {
                throw new popupteam.popupbackend.common.exception.ForbiddenException("본인이 등록한 팝업의 예약만 처리할 수 있습니다.");
            }
            assertSamePopup(popupId, r.getPopup().getId());
            if (r.getEntryStatus() == popupteam.popupbackend.domain.reservation.EntryStatus.CHECKED_IN) {
                throw new IllegalArgumentException("이미 입장 처리된 예약입니다.");
            }
            if (r.getStatus() == popupteam.popupbackend.domain.reservation.ReservationStatus.CANCELLED) {
                throw new IllegalArgumentException("취소된 예약입니다.");
            }

            r.setEntryStatus(popupteam.popupbackend.domain.reservation.EntryStatus.CHECKED_IN);
            r.setCheckedInAt(java.time.LocalDateTime.now());
            r.setCheckedInBy(requesterEmail);
            reservationRepository.save(r);

            return UnifiedQueueEntryResponse.builder()
                    .source("RESERVATION")
                    .refId(r.getId())
                    .displayName(r.getCustomer().getNickname())
                    .partySize(r.getPartySize())
                    .entryStatus(r.getEntryStatus().name())
                    .build();
        }

        var waitingOpt = waitingQueueRepository.findByQrToken(qrToken);
        if (waitingOpt.isPresent()) {
            var w = waitingOpt.get();

            if (!isAdmin && !w.getPopup().getBusiness().getEmail().equals(requesterEmail)) {
                throw new popupteam.popupbackend.common.exception.ForbiddenException("본인이 등록한 팝업의 웨이팅만 처리할 수 있습니다.");
            }
            assertSamePopup(popupId, w.getPopup().getId());
            if (w.getStatus() == popupteam.popupbackend.domain.waiting.WaitingStatus.ENTERED) {
                throw new IllegalArgumentException("이미 입장 처리된 웨이팅입니다.");
            }
            if (w.getStatus() == popupteam.popupbackend.domain.waiting.WaitingStatus.CANCELLED) {
                throw new IllegalArgumentException("취소된 웨이팅입니다.");
            }

            w.setStatus(popupteam.popupbackend.domain.waiting.WaitingStatus.ENTERED);
            w.setEnteredAt(java.time.LocalDateTime.now());
            waitingQueueRepository.save(w);

            String displayName = (w.getCustomer() != null) ? w.getCustomer().getNickname() : w.getName();

            return UnifiedQueueEntryResponse.builder()
                    .source("ONSITE_WAITING")
                    .refId(w.getId())
                    .displayName(displayName)
                    .partySize(w.getPartySize())
                    .entryStatus(w.getStatus().name())
                    .build();
        }

        throw new IllegalArgumentException("유효하지 않은 QR 코드입니다.");
    }

    // 통합 QR 퇴장 처리: 예약 QR 먼저 시도, 없으면 웨이팅 QR 시도
    public UnifiedQueueEntryResponse exitByQr(String qrToken, Long popupId, String requesterEmail, boolean isAdmin) {
        var reservationOpt = reservationRepository.findByQrToken(qrToken);
        if (reservationOpt.isPresent()) {
            var r = reservationOpt.get();

            if (!isAdmin && !r.getPopup().getBusiness().getEmail().equals(requesterEmail)) {
                throw new popupteam.popupbackend.common.exception.ForbiddenException("본인이 등록한 팝업의 예약만 처리할 수 있습니다.");
            }
            assertSamePopup(popupId, r.getPopup().getId());
            if (r.getEntryStatus() != popupteam.popupbackend.domain.reservation.EntryStatus.CHECKED_IN) {
                throw new IllegalArgumentException("입장 처리되지 않은 예약은 퇴장 처리할 수 없습니다.");
            }
            if (r.getExitedAt() != null) {
                throw new IllegalArgumentException("이미 퇴장 처리된 예약입니다.");
            }

            r.setExitedAt(java.time.LocalDateTime.now());
            reservationRepository.save(r);

            return UnifiedQueueEntryResponse.builder()
                    .source("RESERVATION")
                    .refId(r.getId())
                    .displayName(r.getCustomer().getNickname())
                    .partySize(r.getPartySize())
                    .entryStatus(r.getEntryStatus().name())
                    .build();
        }

        var waitingOpt = waitingQueueRepository.findByQrToken(qrToken);
        if (waitingOpt.isPresent()) {
            var w = waitingOpt.get();

            if (!isAdmin && !w.getPopup().getBusiness().getEmail().equals(requesterEmail)) {
                throw new popupteam.popupbackend.common.exception.ForbiddenException("본인이 등록한 팝업의 웨이팅만 처리할 수 있습니다.");
            }
            assertSamePopup(popupId, w.getPopup().getId());
            if (w.getStatus() != popupteam.popupbackend.domain.waiting.WaitingStatus.ENTERED) {
                throw new IllegalArgumentException("입장 처리되지 않은 웨이팅은 퇴장 처리할 수 없습니다.");
            }
            if (w.getExitedAt() != null) {
                throw new IllegalArgumentException("이미 퇴장 처리된 웨이팅입니다.");
            }

            w.setExitedAt(java.time.LocalDateTime.now());
            waitingQueueRepository.save(w);

            String displayName = (w.getCustomer() != null) ? w.getCustomer().getNickname() : w.getName();

            return UnifiedQueueEntryResponse.builder()
                    .source("ONSITE_WAITING")
                    .refId(w.getId())
                    .displayName(displayName)
                    .partySize(w.getPartySize())
                    .entryStatus(w.getStatus().name())
                    .build();
        }

        throw new IllegalArgumentException("유효하지 않은 QR 코드입니다.");
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return name;
        int len = name.length();
        if (len == 1) return name;
        if (len == 2) return name.charAt(0) + "*";
        StringBuilder sb = new StringBuilder();
        sb.append(name.charAt(0));
        for (int i = 1; i < len - 1; i++) sb.append('*');
        sb.append(name.charAt(len - 1));
        return sb.toString();
    }
}