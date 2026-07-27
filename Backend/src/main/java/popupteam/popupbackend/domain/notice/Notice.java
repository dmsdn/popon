package popupteam.popupbackend.domain.notice;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.popup.Popup;
import java.time.LocalDateTime;

@Entity
@Table(name = "notice")
@Getter @Setter
@NoArgsConstructor
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id")
    private Popup popup; // 특정 팝업과 무관한 공지(예: 관리자 일반 공지)면 null

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_type", nullable = false)
    private NoticeRecipientType recipientType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NoticeCategory category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "recipient_count", nullable = false)
    private Integer recipientCount;

    @Column(name = "sent_by")
    private String sentBy; // 발송 주체 이메일, 자동알림이면 "system"

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt = LocalDateTime.now();
}