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
    private final popupteam.popupbackend.domain.consumer.CustomerAccountRepository customerRepository;

    // 버그 수정: 마이페이지 "알림 설정"에서 팝업 소식/예약·웨이팅 알림을 꺼도 실제 발송 로직에서는
    // 전혀 체크하지 않고 있었음 (예약 리마인더 스케줄러 2곳만 예외적으로 체크). 자동 발송되는
    // 알림들은 여기서 필터링해서, 꺼둔 사람에게는 인앱 알림함에도 쌓이지 않도록 한다.
    private Set<Long> filterByPopupNewsAgreed(Set<Long> customerIds) {
        if (customerIds.isEmpty()) return customerIds;
        Set<Long> result = new HashSet<>();
        for (var customer : customerRepository.findAllById(customerIds)) {
            if (!Boolean.FALSE.equals(customer.getPopupNewsAgreed())) {
                result.add(customer.getId());
            }
        }
        return result;
    }

    private Set<Long> filterByReservationWaitingAgreed(Set<Long> customerIds) {
        if (customerIds.isEmpty()) return customerIds;
        Set<Long> result = new HashSet<>();
        for (var customer : customerRepository.findAllById(customerIds)) {
            if (!Boolean.FALSE.equals(customer.getReservationWaitingAgreed())) {
                result.add(customer.getId());
            }
        }
        return result;
    }

    // [신규 8/5] 관리자 일반 공지를 소비자 알림함에도 남긴다.
    //
    // 「관리자가 보낸 공지사항 알림이 안 온다」는 신고의 원인 —
    // AnnouncementController.create()가 공지 게시판(announcement 테이블)에만 저장하고
    // 알림함(notice·notice_recipient)에는 아무것도 안 남기고 있었다.
    // Notice.popup 필드에 「특정 팝업과 무관한 공지면 null」이라는 주석이 이미 있는 걸 보면
    // 원래 이 용도를 염두에 둔 구조인데 연결만 빠져 있었다.
    //
    // 대상은 전체 활성 회원이라 수신자 행이 회원 수만큼 생긴다. 지금 규모(수십 명)에서는
    // saveAll 한 번으로 충분하지만, 회원이 수만 명이 되면 이 방식(수신자 테이블 팬아웃)
    // 자체를 재검토해야 한다 — 그때는 「전체 공지」를 개인 수신함에 복제하지 않고
    // 읽음 여부만 따로 기록하는 구조가 맞다.
    public void notifyAnnouncementCreated(popupteam.popupbackend.domain.announcement.Announcement announcement) {
        List<Long> customerIds = customerRepository.findAllActiveIds();
        if (customerIds.isEmpty()) return;

        Notice notice = createNotice(null, NoticeRecipientType.CUSTOMER, NoticeCategory.NOTICE,
                announcement.getTitle(), announcement.getContent(), "admin", customerIds.size());
        saveRecipients(notice, new HashSet<>(customerIds));
    }

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
        wishlistCustomerIds = filterByPopupNewsAgreed(wishlistCustomerIds);
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
        reservationCustomerIds = filterByReservationWaitingAgreed(reservationCustomerIds);
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
        waitingCustomerIds = filterByReservationWaitingAgreed(waitingCustomerIds);
        if (!waitingCustomerIds.isEmpty()) {
            Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                    "웨이팅 중인 팝업 정보 변경", "웨이팅 중이신 \"" + popup.getTitle() + "\" 팝업의 정보가 수정되었습니다.",
                    "system", waitingCustomerIds.size());
            saveRecipients(notice, waitingCustomerIds);
        }
    }

    // === 1. 예약 완료 시 인앱 알림함(Notice)에 쌓아주는 알림 ===
    public void notifyReservationCreated(Reservation reservation) {
        Popup popup = reservation.getPopup();
        String when = reservation.getReservationTime() != null
                ? reservation.getReservationDate() + " " + reservation.getReservationTime()
                : reservation.getReservationDate().toString();

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.RESERVATION,
                "예약이 완료되었습니다",
                "\"" + popup.getTitle() + "\" 예약이 완료되었어요. 방문 예정: " + when,
                "system", 1);
        saveRecipients(notice, Set.of(reservation.getCustomer().getId()));
    }

    // === 2. 예약 날짜 당일 개인화 알림 (매일 스케줄러가 호출) ===
    public void notifyReservationDayArrived(Reservation reservation) {
        Popup popup = reservation.getPopup();
        String when = reservation.getReservationTime() != null
                ? " (" + reservation.getReservationTime() + ")" : "";

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.RESERVATION,
                "오늘 예약하신 날이에요",
                "오늘은 \"" + popup.getTitle() + "\" 예약하신 날" + when + "이에요. 즐거운 방문 되세요!",
                "system", 1);
        saveRecipients(notice, Set.of(reservation.getCustomer().getId()));
    }

    // === 3. 예약 시간 임박 알림 (스케줄러가 호출) ===
    public void notifyReservationTimeApproaching(Reservation reservation, int minutesLeft) {
        Popup popup = reservation.getPopup();

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.RESERVATION,
                "예약 시간이 얼마 남지 않았어요",
                "\"" + popup.getTitle() + "\" 예약 시간이 " + minutesLeft + "분 남았어요. 잊지 말고 방문해주세요!",
                "system", 1);
        saveRecipients(notice, Set.of(reservation.getCustomer().getId()));
    }

    // === 5. 웨이팅 등록 완료 시 인앱 알림함(Notice)에 쌓아주는 알림 ===
    // (이메일/SMS QR은 WaitingQueueService에서 이미 보내고 있었음 - 여기선 인앱 알림함만 채움)
    public void notifyWaitingRegistered(WaitingQueue waiting) {
        if (waiting.getCustomer() == null) return; // 비회원 웨이팅은 알림함이 없음
        if (filterByReservationWaitingAgreed(Set.of(waiting.getCustomer().getId())).isEmpty()) return;
        Popup popup = waiting.getPopup();

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                "웨이팅 등록이 완료되었습니다",
                "\"" + popup.getTitle() + "\" 웨이팅 " + waiting.getTeamNumber() + "번으로 등록되었어요.",
                "system", 1);
        saveRecipients(notice, Set.of(waiting.getCustomer().getId()));
    }

    // === 6. 웨이팅 호출(내 차례) 알림 - 인앱 알림함 ===
    public void notifyWaitingCalled(WaitingQueue waiting) {
        if (waiting.getCustomer() == null) return;
        if (filterByReservationWaitingAgreed(Set.of(waiting.getCustomer().getId())).isEmpty()) return;
        Popup popup = waiting.getPopup();

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                "지금 입장해주세요!",
                "\"" + popup.getTitle() + "\" 웨이팅 " + waiting.getTeamNumber() + "번, 지금 입장 차례예요. 15분 내로 입장해주세요.",
                "system", 1);
        saveRecipients(notice, Set.of(waiting.getCustomer().getId()));
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

    // [수정 8/5] 한 건씩 save 하던 것을 saveAll 한 번으로 묶었다.
    // 수신자가 많을수록 왕복 횟수가 그대로 늘어나는데, DB가 EC2 원격이라 왕복 하나하나가
    // 비용이다(공용 DB 시절 N+1로 예약 조회가 타임아웃 났던 그 문제와 같은 성질).
    // 관리자 일반 공지는 전체 회원이 대상이라 특히 이 경로를 탄다.
    private void saveRecipients(Notice notice, Set<Long> recipientIds) {
        if (recipientIds.isEmpty()) return;
        List<NoticeRecipient> rows = new ArrayList<>(recipientIds.size());
        for (Long id : recipientIds) {
            NoticeRecipient nr = new NoticeRecipient();
            nr.setNotice(notice);
            nr.setRecipientId(id);
            rows.add(nr);
        }
        noticeRecipientRepository.saveAll(rows);
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
            wishlistIds = filterByPopupNewsAgreed(wishlistIds);
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
            reservationIds = filterByReservationWaitingAgreed(reservationIds);
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
            waitingIds = filterByReservationWaitingAgreed(waitingIds);
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
        wishlistIds = filterByPopupNewsAgreed(wishlistIds);
        if (!wishlistIds.isEmpty()) {
            Notice n = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WISHLIST,
                    title, "찜하신 \"" + popup.getTitle() + "\" 팝업이 내일 종료됩니다.", "system", wishlistIds.size());
            saveRecipients(n, wishlistIds);
        }
    }

    // === 7. 웨이팅 혼잡 알림 (스케줄러가 호출) ===
    public void sendCongestionAlert(Popup popup, Set<Long> waitingCustomerIds) {
        Set<Long> filtered = filterByReservationWaitingAgreed(waitingCustomerIds);
        if (filtered.isEmpty()) return;
        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.WAITING,
                "대기 혼잡 안내", "\"" + popup.getTitle() + "\" 현재 대기가 혼잡합니다. 잠시 여유를 가지고 기다려주세요.",
                "system", filtered.size());
        saveRecipients(notice, filtered);
    }

    // === 8. 후기 신고 처리(가리기) 결과 안내 - 신고자에게는 안 가고, 후기 작성자 본인에게만 감 ===
    public void notifyReviewHidden(Long popupId, Long reviewAuthorCustomerId) {
        Popup popup = popupRepository.findById(popupId).orElse(null);
        if (popup == null) return; // 팝업이 이미 삭제됐으면 알림은 조용히 생략 (치명적이지 않음)

        Notice notice = createNotice(popup, NoticeRecipientType.CUSTOMER, NoticeCategory.NOTICE,
                "후기 가림 처리 안내", "고객님의 후기가 다른 사용자의 신고로인해 가려졌습니다.",
                "system", 1);
        saveRecipients(notice, Set.of(reviewAuthorCustomerId));
    }
}