package popupteam.popupbackend.domain.venue;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.business.Business;
import java.time.LocalDateTime;

@Entity
@Table(name = "venue_meeting_request")
@Getter @Setter
@NoArgsConstructor
public class VenueMeetingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VenueMeetingStatus status = VenueMeetingStatus.REQUESTED;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();
}