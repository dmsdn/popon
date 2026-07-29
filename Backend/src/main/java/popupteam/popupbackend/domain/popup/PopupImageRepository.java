package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupImageRepository extends JpaRepository<PopupImage, Long> {
    List<PopupImage> findByPopupIdOrderBySortOrder(Long popupId);
    List<PopupImage> findByPopupIdAndTypeOrderBySortOrder(Long popupId, PopupImageType type);
    // 목록/검색 화면에서 여러 팝업의 이미지를 한 번에 조회 (N+1 방지)
    List<PopupImage> findByPopupIdInAndTypeOrderBySortOrder(List<Long> popupIds, PopupImageType type);

    // 새 이미지를 넣을 때 정렬순서를 이어붙이기 위한 현재 최대값 조회 (타입별로 따로 관리)
    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(MAX(i.sortOrder), -1) FROM PopupImage i WHERE i.popup.id = :popupId AND i.type = :type")
    Integer findMaxSortOrder(@org.springframework.data.repository.query.Param("popupId") Long popupId,
                             @org.springframework.data.repository.query.Param("type") PopupImageType type);
}