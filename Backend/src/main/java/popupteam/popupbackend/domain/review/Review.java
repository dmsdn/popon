package popupteam.popupbackend.domain.review;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "review")
@Getter
@Setter
@NoArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "popup_id", nullable = false)
    private Long popupId;

    @Column(nullable = false)
    private BigDecimal rating;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 실제로 다녀간 날짜 (프론트가 예약 체크인/웨이팅 입장 기록에서 계산해서 보냄, 기록 없으면 null)
    @Column(name = "visit_date")
    private LocalDate visitDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}