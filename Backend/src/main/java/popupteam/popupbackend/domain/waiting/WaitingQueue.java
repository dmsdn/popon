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
}