package popupteam.popupbackend.domain.banner;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "banner")
@Getter @Setter
@NoArgsConstructor
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title; // 관리용 제목 (소비자에게 노출 안 됨)

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Column(name = "link_url")
    private String linkUrl; // 클릭 시 이동할 주소 (예: 팝업 상세페이지)

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "start_date")
    private LocalDateTime startDate; // null이면 시작일 제한 없음

    @Column(name = "end_date")
    private LocalDateTime endDate; // null이면 종료일 제한 없음

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}