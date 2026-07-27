package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "popup_click_log")
@Getter @Setter
@NoArgsConstructor
public class PopupClickLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "popup_id", nullable = false)
    private Long popupId;

    @Column(name = "customer_id")
    private Long customerId; // 비회원 클릭이면 null

    @Column(name = "clicked_at", nullable = false)
    private LocalDateTime clickedAt = LocalDateTime.now();
}