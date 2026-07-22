package popupteam.popupbackend.domain.inquiry;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.business.Business;
import java.time.LocalDateTime;

@Entity
@Table(name = "organizer_inquiry")
@Getter @Setter
@NoArgsConstructor
public class OrganizerInquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String answerContent;

    @Column(name = "answered_by")
    private String answeredBy;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}