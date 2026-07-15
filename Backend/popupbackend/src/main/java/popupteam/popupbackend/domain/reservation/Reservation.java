package popupteam.popupbackend.domain.reservation;

import jakarta.persistence.*;
import lombok.*;
import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.popup.PopupSlot;
import java.time.LocalDateTime;

@Entity
@Table(name = "popup_reservation")
@Getter @Setter
@NoArgsConstructor
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private PopupSlot slot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "party_size", nullable = false)
    private Integer partySize = 1;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}