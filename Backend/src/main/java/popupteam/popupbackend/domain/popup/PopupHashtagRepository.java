package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PopupHashtagRepository extends JpaRepository<PopupHashtag, Long> {
    List<PopupHashtag> findByPopupIdOrderBySortOrderAsc(Long popupId);
    void deleteByPopupId(Long popupId);
    // 비슷한 팝업 추천용 - 주어진 태그 중 하나라도 겹치는 다른 팝업의 태그 로우 전체
    List<PopupHashtag> findByTagInAndPopupIdNot(List<String> tags, Long popupId);
    // 목록/검색 화면에서 여러 팝업의 해시태그를 한 번에 조회 (N+1 방지)
    List<PopupHashtag> findByPopupIdInOrderBySortOrderAsc(List<Long> popupIds);
}