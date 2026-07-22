package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupImageRepository extends JpaRepository<PopupImage, Long> {
    List<PopupImage> findByPopupIdOrderBySortOrder(Long popupId);
}