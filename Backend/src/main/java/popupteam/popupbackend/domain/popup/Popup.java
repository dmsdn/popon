package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.business.Business;
import java.time.LocalDateTime;

@Entity
@Table(name = "popup")
@Getter @Setter
@NoArgsConstructor
public class Popup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    private String location;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    private PopupStatus status;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "area_sqm")
    private Double areaSqm;

    @Column(name = "recommended_capacity")
    private Integer recommendedCapacity;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(name = "reservation_mode", nullable = false)
    private ReservationMode reservationMode;

    @Column(name = "avg_experience_minutes", nullable = false)
    private Integer avgExperienceMinutes;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "queue_mode", nullable = false)
    private QueueMode queueMode = QueueMode.BOTH;

    // 상태(승인/반려 등)가 마지막으로 확정된 일시
    private LocalDateTime statusChangedAt;

    // 관리자가 반려/수정 시 남기는 사유 메모 (없으면 null)
    @Column(length = 1000)
    private String adminEditNote;

    private Double latitude;
    private Double longitude;

}