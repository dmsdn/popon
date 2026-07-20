package popupteam.popupbackend.domain.popup;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "popup_contract")
@Getter @Setter
@NoArgsConstructor
public class PopupContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "popup_id", nullable = false, unique = true)
    private Popup popup;

    @Column(name = "contract_amount", nullable = false, precision = 15, scale = 0)
    private BigDecimal contractAmount;

    @Column(name = "memo", columnDefinition = "TEXT")
    private String memo;

    @Column(name = "registered_by", nullable = false)
    private String registeredBy; // 등록/수정한 관리자 이메일

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false)
    private ContractStage stage = ContractStage.CONTRACTED;

}