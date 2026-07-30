package popupteam.popupbackend.domain.review;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "review", uniqueConstraints = @UniqueConstraint(name = "uq_review_customer_popup", columnNames = {"customer_id", "popup_id"}))
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

    // 신고 처리 결과 관리자가 부적절하다고 판단해서 숨김 처리했는지 여부 (숨겨져도 삭제는 아니고, 소비자 화면엔 안내문구로 대체되어 보임)
    @Column(nullable = false)
    private boolean hidden = false;

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