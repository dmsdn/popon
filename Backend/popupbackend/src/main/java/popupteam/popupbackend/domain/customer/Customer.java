package popupteam.popupbackend.domain.customer;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "customer")
@Getter @Setter
@NoArgsConstructor
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nickname;
}