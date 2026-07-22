package popupteam.popupbackend.domain.eventlog;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_event_log")
@Getter @Setter
@NoArgsConstructor
public class TransactionEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "popup_id", nullable = false)
    private Long popupId;

    @Column(name = "entity_type", nullable = false, length = 20)
    private String entityType; // "RESERVATION" 또는 "WAITING"

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType; // "CANCELLED", "CHECKED_IN", "NO_SHOW", "CALLED", "ENTERED" 등

    @Column(length = 100)
    private String actor; // "business:5", "admin:1", "system" 등

    @Column(length = 500)
    private String memo;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}