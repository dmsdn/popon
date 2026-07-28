package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PopupSnsLinkRepository
        extends JpaRepository<PopupSnsLink, Long> {

    List<PopupSnsLink> findByPopup_IdOrderBySortOrderAscIdAsc(Long popupId);

    void deleteByPopup_Id(Long popupId);
}