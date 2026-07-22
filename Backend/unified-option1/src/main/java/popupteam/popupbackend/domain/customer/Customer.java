package popupteam.popupbackend.domain.customer;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer")
@Getter @Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nickname;

    @Column(nullable = false)
    private Boolean withdrawn = false;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;
}