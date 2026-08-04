package popupteam.popupbackend.domain.reservation;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.consumer.Customer;
import popupteam.popupbackend.domain.popup.Popup;
import popupteam.popupbackend.domain.popup.PopupSlot;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "popup_reservation")
@Getter @Setter
@NoArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SLOT 모드일 때만 사용 (FREE 모드면 null)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = true)
    private PopupSlot slot;

    // FREE 모드일 때 직접 팝업 참조 (SLOT 모드면 slot.getPopup()으로 유추 가능하지만, 조회 편의상 항상 채워둠)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id", nullable = false)
    private Popup popup;

    // FREE 모드일 때 방문 예정일 (SLOT 모드면 slot.getSlotDate()로 대체 가능하지만 조회 편의상 항상 채워둠)
    @Column(name = "reservation_date")
    private LocalDate reservationDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "party_size", nullable = false)
    private Integer partySize = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReservationStatus status = ReservationStatus.CONFIRMED; // 결제 없이 즉시 확정

    @Column(name = "cancel_reason")
    private String cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_status", nullable = false)
    private EntryStatus entryStatus = EntryStatus.PENDING;

    @Column(name = "qr_token", unique = true, nullable = false, length = 36)
    private String qrToken;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_in_by")
    private String checkedInBy;

    // 퇴장 처리 시각 (null이면 아직 체류 중)
    private LocalDateTime exitedAt;

    // FREE 모드에서 소비자가 선택한 방문 예정 시각 (선택입력이라 null 가능, SLOT 모드면 slot의 시간을 쓰므로 항상 null)
    @Column(name = "reservation_time")
    private LocalTime reservationTime;

    // 예약 시간 임박 알림(#3)을 이미 보냈는지 - 중복 발송 방지용. ddl-auto: update로 자동 생성됨.
    @Column(name = "time_reminder_sent_at")
    private LocalDateTime timeReminderSentAt;

    // 예약 당일 알림(#2)을 이미 보냈는지 - 중복 발송 방지용.
    @Column(name = "day_reminder_sent_at")
    private LocalDateTime dayReminderSentAt;

}