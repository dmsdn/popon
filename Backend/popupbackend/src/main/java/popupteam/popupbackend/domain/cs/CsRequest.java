package popupteam.popupbackend.domain.cs;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.customer.Customer;
import java.time.LocalDateTime;

@Entity
@Table(name = "cs_request")
@Getter @Setter
@NoArgsConstructor
public class CsRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CsStatus status = CsStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String answerContent;

    @Column(name = "answered_by")
    private String answeredBy;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
