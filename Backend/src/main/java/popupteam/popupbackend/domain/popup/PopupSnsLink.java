package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "popup_sns_link",
        indexes = {
                @Index(
                        name = "idx_popup_sns_link_popup_id",
                        columnList = "popup_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
public class PopupSnsLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "popup_id", nullable = false)
    private Popup popup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SnsPlatform platform;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;
}