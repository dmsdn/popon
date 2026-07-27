package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PopupHashtagRepository extends JpaRepository<PopupHashtag, Long> {
    List<PopupHashtag> findByPopupIdOrderBySortOrderAsc(Long popupId);
    void deleteByPopupId(Long popupId);
}