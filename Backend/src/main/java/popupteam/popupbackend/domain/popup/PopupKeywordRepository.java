package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupKeywordRepository extends JpaRepository<PopupKeyword, PopupKeyword.PK> {
    List<PopupKeyword> findByPopupId(Long popupId);
    List<PopupKeyword> findByKeywordId(Long keywordId);
    void deleteByPopupId(Long popupId);
    void deleteByKeywordId(Long keywordId);
    // 목록/검색 화면에서 여러 팝업의 표준 키워드를 한 번에 조회 (N+1 방지)
    List<PopupKeyword> findByPopupIdIn(List<Long> popupIds);
}