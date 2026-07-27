package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "popup_hashtag")
@Getter
@Setter
@NoArgsConstructor
public class PopupHashtag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "popup_id", nullable = false)
    private Long popupId;

    @Column(nullable = false)
    private String tag;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public PopupHashtag(Long popupId, String tag, Integer sortOrder) {
        this.popupId = popupId;
        this.tag = tag;
        this.sortOrder = sortOrder;
    }
}