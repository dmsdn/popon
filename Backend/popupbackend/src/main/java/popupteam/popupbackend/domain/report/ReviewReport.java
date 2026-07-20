package popupteam.popupbackend.domain.report;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.customer.Customer;
import java.time.LocalDateTime;

@Entity
@Table(name = "review_report")
@Getter @Setter
@NoArgsConstructor
public class ReviewReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId; // review 테이블 FK (customerbackend 소유 테이블이라 엔티티 매핑 대신 ID만 저장)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_customer_id", nullable = false)
    private Customer reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportReason reason;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "processed_by")
    private String processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}