package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PopupContractRepository extends JpaRepository<PopupContract, Long> {
    Optional<PopupContract> findByPopupId(Long popupId);
}