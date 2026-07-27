package popupteam.popupbackend.domain.notice;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notice_recipient")
@Getter @Setter
@NoArgsConstructor
public class NoticeRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notice_id", nullable = false)
    private Notice notice;

    // recipientType에 따라 customerId 또는 businessId를 의미함
    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(name = "read_at")
    private LocalDateTime readAt;
}