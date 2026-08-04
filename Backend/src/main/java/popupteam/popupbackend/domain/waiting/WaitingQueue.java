package popupteam.popupbackend.domain.waiting;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.popup.Popup;
import java.time.LocalDateTime;

@Entity
@Table(name = "waiting_queue")
@Getter @Setter
@NoArgsConstructor
public class WaitingQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id", nullable = false)
    private Popup popup;

    // 회원 웨이팅일 때만 채워짐
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // 비회원 웨이팅일 때 필수
    private String name;
    private String email;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "party_size", nullable = false)
    private Integer partySize;

    @Column(name = "team_number", nullable = false)
    private Integer teamNumber;

    @Column(name = "qr_token", unique = true, nullable = false, length = 36)
    private String qrToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WaitingStatus status = WaitingStatus.WAITING;

    @Column(name = "registered_at")
    private LocalDateTime registeredAt = LocalDateTime.now();

    @Column(name = "called_at")
    private LocalDateTime calledAt;

    @Column(name = "call_expires_at")
    private LocalDateTime callExpiresAt;

    @Column(name = "entered_at")
    private LocalDateTime enteredAt;
    // 퇴장 처리 시각 (null이면 아직 체류 중)
    private LocalDateTime exitedAt;

    // cancel_reason 컬럼은 8/4 당일 폐기 — 미입장을 CANCELLED+사유 문자열로 구분하던 우회였는데,
    // 「안 왔다」는 상태 그 자체이므로 WaitingStatus.NO_SHOW로 표현한다(예약의 EntryStatus.NO_SHOW와 동형).
    // 폐기 시점에 이 컬럼에 저장된 데이터는 0건이었다. DB 컬럼은 남아 있어도 무해하다.
}