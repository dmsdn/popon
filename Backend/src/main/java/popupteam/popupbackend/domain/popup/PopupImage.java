package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "popup_image")
@Getter @Setter
@NoArgsConstructor
public class PopupImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id", nullable = false)
    private Popup popup;

    @Column(name = "image_url", nullable = false)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PopupImageType type = PopupImageType.THUMBNAIL;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}