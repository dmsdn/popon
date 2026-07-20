package popupteam.popupbackend.domain.visit;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "platform_visit_log", uniqueConstraints = {
        @UniqueConstraint(name = "uq_visit_dedup", columnNames = {"visitor_key", "visit_date", "app_source"})
})
@Getter @Setter
@NoArgsConstructor
public class PlatformVisitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visitor_key", nullable = false, length = 100)
    private String visitorKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "app_source", nullable = false)
    private AppSource appSource;

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}