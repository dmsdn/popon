package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupSlotRepository extends JpaRepository<PopupSlot, Long> {
    List<PopupSlot> findByPopupId(Long popupId);
}