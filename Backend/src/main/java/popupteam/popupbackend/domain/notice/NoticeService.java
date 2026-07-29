package popupteam.popupbackend.domain.notice;

import popupteam.popupbackend.domain.notice.dto.*;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupRepository;
import popupteam.popupbackend.domain.reservation.Reservation;
import popupteam.popupbackend.domain.reservation.ReservationRepository;
import popupteam.popupbackend.domain.reservation.ReservationStatus;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import popupteam.popupbackend.domain.waiting.WaitingQueueRepository;
import popupteam.popupbackend.domain.waiting.WaitingStatus;
import popupteam.popupbackend.domain.wishlist.PopupWishlist;
import popupteam.popupbackend.domain.wishlist.PopupWishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeRecipientRepository noticeRecipientRepository;
    private final PopupRepository popupRepository;
    private final ReservationRepository reservationRepository;
    private final WaitingQueueRepository waitingQueueRepository;
    private final PopupWishlistRepository popupWishlistRepository;

    // === 주최자 → 소비자 긴급공지 발송 ===
    public NoticeResponse sendFromOrganizer(Long popupId, Long businessId, String requesterEmail, NoticeSendRequest request) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업에만 공지를 보낼 수 있습니다.");
        }

        Set<Long> customerIds = collectTargetCustomerIds(popupId, request.getTargets());

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.NOTICE,
                request.getTitle(), request.getContent(), requesterEmail, customerIds.size());

        saveRecipients(notice, customerIds);

        return NoticeResponse.from(notice);
    }

    public List<NoticeResponse> getOrganizerHistory(Long popupId, Long businessId) {
        Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        if (!popup.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("본인이 등록한 팝업의 발송 이력만 조회할 수 있습니다.");
        }

        return noticeRepository.findByPopupIdOrderBySentAtDesc(popupId).stream()
                .map(NoticeResponse::from)
                .toList();
    }

    private Set<Long> collectTargetCustomerIds(Long popupId, List<String> targetCodes) {
        Set<Long> customerIds = new HashSet<>();

        for (String targetCode : targetCodes) {
            switch (targetCode) {
                case "ALL_RESERVED" -> {
                    List<Reservation> list = reservationRepository.findByPopupIdAndStatus(popupId, ReservationStatus.CONFIRMED);
                    for (Reservation r : list) {
                        if (r.getCustomer() != null) customerIds.add(r.getCustomer().getId());
                    }
                }
                case "TODAY_RESERVED" -> {
                    List<Reservation> list = reservationRepository
                            .findByPopupIdAndReservationDateAndStatus(popupId, LocalDate.now(), ReservationStatus.CONFIRMED);
                    for (Reservation r : list) {
                        if (r.getCustomer() != null) customerIds.add(r.getCustomer().getId());
                    }
                }
                case "ONSITE_WAITING" -> {
                    List<WaitingQueue> list = waitingQueueRepository
                            .findByPopupIdAndStatusIn(popupId, List.of(WaitingStatus.WAITING, WaitingStatus.CALLED));
                    for (WaitingQueue w : list) {
                        if (w.getCustomer() != null) customerIds.add(w.getCustomer().getId());
                    }
                }
                case "WISHLIST" -> {
                    List<PopupWishlist> list = popupWishlistRepository.findByPopupId(popupId);
                    for (PopupWishlist wl : list) {
                        customerIds.add(wl.getCustomerId());
                    }
                }
                default -> throw new IllegalArgumentException("알 수 없는 발송 대상입니다: " + targetCode);
            }
        }
        return customerIds;
    }

    // === 팝업 수정 시 즉시 알림 (찜/예약/웨이팅 대상자에게 각각) ===
    // PopupService.update()에서 저장 직후 호출됨
    public void notifyPopupUpdated(Popup popup) {
        Long popupId = popup.getId();

        Set<Long> wishlistCustomerIds = new HashSet<>();
        for (PopupWishlist wl : popupWishlistRepository.findByPopupId(popupId)) {
            wishlistCustomerIds.add(wl.getCustomerId());
        }
        if (!wishlistCustomerIds.isEmpty()) {
            Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WISHLIST,
                    "찜한 팝업 정보 변경", "찜하신 \"" + popup.getTitle() + "\" 팝업의 정보가 수정되었습니다.",
                    "system", wishlistCustomerIds.size());
            saveRecipients(notice, wishlistCustomerIds);
        }

        Set<Long> reservationCustomerIds = new HashSet<>();
        for (Reservation r : reservationRepository.findByPopupIdAndStatus(popupId, ReservationStatus.CONFIRMED)) {
            if (r.getCustomer() != null) reservationCustomerIds.add(r.getCustomer().getId());
        }
        if (!reservationCustomerIds.isEmpty()) {
            Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.RESERVATION,
                    "예약한 팝업 정보 변경", "예약하신 \"" + popup.getTitle() + "\" 팝업의 정보가 수정되었습니다.",
                    "system", reservationCustomerIds.size());
            saveRecipients(notice, reservationCustomerIds);
        }

        Set<Long> waitingCustomerIds = new HashSet<>();
        for (WaitingQueue w : waitingQueueRepository.findByPopupIdAndStatusIn(popupId, List.of(WaitingStatus.WAITING, WaitingStatus.CALLED))) {
            if (w.getCustomer() != null) waitingCustomerIds.add(w.getCustomer().getId());
        }
        if (!waitingCustomerIds.isEmpty()) {
            Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                    "웨이팅 중인 팝업 정보 변경", "웨이팅 중이신 \"" + popup.getTitle() + "\" 팝업의 정보가 수정되었습니다.",
                    "system", waitingCustomerIds.size());
            saveRecipients(notice, waitingCustomerIds);
        }
    }

    // === 관리자 → 주최자 알림 ===
    public NoticeResponse sendToBusiness(Long businessId, Long popupId, String title, String content, String sentBy) {
        Popup popup = null;
        if (popupId != null) {
            popup = popupRepository.findById(popupId)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));
        }

        Notice notice = createNotice(popup, NoticeRecipientType.BUSINESS, NoticeCategory.NOTICE,
                title, content, sentBy, 1);
        saveRecipients(notice, Set.of(businessId));

        return NoticeResponse.from(notice);
    }

    // 관리자용 - 지금까지 주최자들에게 보낸 공지 전체 이력 (누구한테 보냈는지, 읽었는지 포함)
    public List<AdminNoticeHistoryResponse> getAdminSentToBusinessHistory() {
        return noticeRecipientRepository.findAllByRecipientType(NoticeRecipientType.BUSINESS).stream()
                .map(AdminNoticeHistoryResponse::from)
                .toList();
    }

    // === 소비자 알림함 ===
    public List<NoticeInboxResponse> getCustomerInbox(Long customerId, String category) {
        List<NoticeRecipient> list = (category != null)
                ? noticeRecipientRepository.findAllForRecipientByCategory(customerId, NoticeRecipientType.CUSTOMER, NoticeCategory.valueOf(category))
                : noticeRecipientRepository.findAllForRecipient(customerId, NoticeRecipientType.CUSTOMER);
        return list.stream().map(NoticeInboxResponse::from).toList();
    }

    public long getCustomerUnreadCount(Long customerId) {
        return noticeRecipientRepository.countUnread(customerId, NoticeRecipientType.CUSTOMER);
    }

    public void markCustomerRead(Long recipientId, Long customerId) {
        NoticeRecipient r = noticeRecipientRepository.findByIdAndRecipientId(recipientId, customerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));
        if (r.getReadAt() == null) {
            r.setReadAt(java.time.LocalDateTime.now());
            noticeRecipientRepository.save(r);
        }
    }

    // === 주최자 알림함 ===
    public List<NoticeInboxResponse> getBusinessInbox(Long businessId, String category) {
        List<NoticeRecipient> list = (category != null)
                ? noticeRecipientRepository.findAllForRecipientByCategory(businessId, NoticeRecipientType.BUSINESS, NoticeCategory.valueOf(category))
                : noticeRecipientRepository.findAllForRecipient(businessId, NoticeRecipientType.BUSINESS);
        return list.stream().map(NoticeInboxResponse::from).toList();
    }

    public long getBusinessUnreadCount(Long businessId) {
        return noticeRecipientRepository.countUnread(businessId, NoticeRecipientType.BUSINESS);
    }

    public void markBusinessRead(Long recipientId, Long businessId) {
        NoticeRecipient r = noticeRecipientRepository.findByIdAndRecipientId(recipientId, businessId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 알림입니다."));
        if (r.getReadAt() == null) {
            r.setReadAt(java.time.LocalDateTime.now());
            noticeRecipientRepository.save(r);
        }
    }

    // === 공통 헬퍼 ===
    private Notice createNotice(Popup popup, NoticeRecipientType recipientType, NoticeCategory category,
                                String title, String content, String sentBy, int recipientCount) {
        Notice notice = new Notice();
        notice.setPopup(popup);
        notice.setRecipientType(recipientType);
        notice.setCategory(category);
        notice.setTitle(title);
        notice.setContent(content);
        notice.setRecipientCount(recipientCount);
        notice.setSentBy(sentBy);
        notice.setSentAt(java.time.LocalDateTime.now());
        return noticeRepository.save(notice);
    }

    private void saveRecipients(Notice notice, Set<Long> recipientIds) {
        for (Long id : recipientIds) {
            NoticeRecipient nr = new NoticeRecipient();
            nr.setNotice(notice);
            nr.setRecipientId(id);
            noticeRecipientRepository.save(nr);
        }
    }

    // === 5,6. 오픈/종료 임박 자동알림 (매일 1회 스케줄러가 호출) ===
    private static final int REMINDER_DEDUP_HOURS = 20;

    public void sendOpenReminder(Popup popup) {
        Long popupId = popup.getId();
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusHours(REMINDER_DEDUP_HOURS);

        String wishlistTitle = "찜한 팝업 오픈 임박 안내";
        if (!noticeRepository.existsByPopupIdAndTitleAndSentAtAfter(popupId, wishlistTitle, cutoff)) {
            Set<Long> wishlistIds = new HashSet<>();
            for (PopupWishlist wl : popupWishlistRepository.findByPopupId(popupId)) wishlistIds.add(wl.getCustomerId());
            if (!wishlistIds.isEmpty()) {
                Notice n = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WISHLIST,
                        wishlistTitle, "찜하신 \"" + popup.getTitle() + "\" 팝업이 내일부터 오픈합니다.", "system", wishlistIds.size());
                saveRecipients(n, wishlistIds);
            }
        }

        String reservationTitle = "예약한 팝업 시작 임박 안내";
        if (!noticeRepository.existsByPopupIdAndTitleAndSentAtAfter(popupId, reservationTitle, cutoff)) {
            Set<Long> reservationIds = new HashSet<>();
            for (Reservation r : reservationRepository.findByPopupIdAndStatus(popupId, ReservationStatus.CONFIRMED)) {
                if (r.getCustomer() != null) reservationIds.add(r.getCustomer().getId());
            }
            if (!reservationIds.isEmpty()) {
                Notice n = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.RESERVATION,
                        reservationTitle, "예약하신 \"" + popup.getTitle() + "\" 팝업이 내일부터 시작됩니다.", "system", reservationIds.size());
                saveRecipients(n, reservationIds);
            }
        }

        String waitingTitle = "웨이팅한 팝업 시작 임박 안내";
        if (!noticeRepository.existsByPopupIdAndTitleAndSentAtAfter(popupId, waitingTitle, cutoff)) {
            Set<Long> waitingIds = new HashSet<>();
            for (WaitingQueue w : waitingQueueRepository.findByPopupIdAndStatusIn(popupId, List.of(WaitingStatus.WAITING, WaitingStatus.CALLED))) {
                if (w.getCustomer() != null) waitingIds.add(w.getCustomer().getId());
            }
            if (!waitingIds.isEmpty()) {
                Notice n = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                        waitingTitle, "웨이팅 등록하신 \"" + popup.getTitle() + "\" 팝업이 내일부터 시작됩니다.", "system", waitingIds.size());
                saveRecipients(n, waitingIds);
            }
        }
    }

    public void sendCloseReminder(Popup popup) {
        Long popupId = popup.getId();
        java.time.LocalDateTime cutoff = java.time.LocalDateTime.now().minusHours(REMINDER_DEDUP_HOURS);

        String title = "찜한 팝업 종료 임박 안내";
        if (noticeRepository.existsByPopupIdAndTitleAndSentAtAfter(popupId, title, cutoff)) return;

        Set<Long> wishlistIds = new HashSet<>();
        for (PopupWishlist wl : popupWishlistRepository.findByPopupId(popupId)) wishlistIds.add(wl.getCustomerId());
        if (!wishlistIds.isEmpty()) {
            Notice n = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WISHLIST,
                    title, "찜하신 \"" + popup.getTitle() + "\" 팝업이 내일 종료됩니다.", "system", wishlistIds.size());
            saveRecipients(n, wishlistIds);
        }
    }

    // === 7. 웨이팅 혼잡 알림 (스케줄러가 호출) ===
    public void sendCongestionAlert(Popup popup, Set<Long> waitingCustomerIds) {
        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                "대기 혼잡 안내", "\"" + popup.getTitle() + "\" 현재 대기가 혼잡합니다. 잠시 여유를 가지고 기다려주세요.",
                "system", waitingCustomerIds.size());
        saveRecipients(notice, waitingCustomerIds);
    }
}