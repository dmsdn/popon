package popupteam.popupbackend.domain.venue;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

@Entity
@Table(name = "venue")
@Getter @Setter
@NoArgsConstructor
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(name = "area_sqm")
    private Double areaSqm;

    @Column(name = "rental_fee", precision = 15, scale = 0)
    private BigDecimal rentalFee;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VenueStatus status = VenueStatus.AVAILABLE;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    private Double latitude;
    private Double longitude;

}