package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "popup_keyword")
@Getter @Setter
@NoArgsConstructor
@IdClass(PopupKeyword.PK.class)
public class PopupKeyword {

    @Id
    @Column(name = "popup_id")
    private Long popupId;

    @Id
    @Column(name = "keyword_id")
    private Long keywordId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public static class PK implements Serializable {
        private Long popupId;
        private Long keywordId;

        public PK() {}

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK)) return false;
            PK pk = (PK) o;
            return Objects.equals(popupId, pk.popupId) && Objects.equals(keywordId, pk.keywordId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(popupId, keywordId);
        }
    }
}