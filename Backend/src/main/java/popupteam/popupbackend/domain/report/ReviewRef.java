package popupteam.popupbackend.domain.report;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "review")
@Getter @Setter
@NoArgsConstructor
public class ReviewRef {

    @Id
    private Long id;

    @Column(name = "popup_id")
    private Long popupId;
}