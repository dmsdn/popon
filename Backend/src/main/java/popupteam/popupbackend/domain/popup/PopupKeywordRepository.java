package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupKeywordRepository extends JpaRepository<PopupKeyword, PopupKeyword.PK> {
    List<PopupKeyword> findByPopupId(Long popupId);
    List<PopupKeyword> findByKeywordId(Long keywordId);
    void deleteByPopupId(Long popupId);
}