package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupImageRepository extends JpaRepository<PopupImage, Long> {
    List<PopupImage> findByPopupIdOrderBySortOrder(Long popupId);
    List<PopupImage> findByPopupIdAndTypeOrderBySortOrder(Long popupId, PopupImageType type);
    // 목록/검색 화면에서 여러 팝업의 이미지를 한 번에 조회 (N+1 방지)
    List<PopupImage> findByPopupIdInAndTypeOrderBySortOrder(List<Long> popupIds, PopupImageType type);

    // type을 안 주고 전체 조회할 때 대표 이미지가 항상 맨 앞에 오도록 보강.
    // sortOrder만으로 정렬하면 THUMBNAIL/DETAIL 각각 0부터 시작해서 순서가 id(등록 순서)에
    // 좌우됨 - 썸네일을 나중에 재업로드하면 상세 이미지 뒤로 밀려서 대표 자리가 바뀌는 문제가 있었음.
    // (ORDER BY type DESC는 알파벳순 THUMBNAIL > DETAIL이라 안 됨 - CASE로 명시)
    @org.springframework.data.jpa.repository.Query(
            "SELECT i FROM PopupImage i WHERE i.popup.id = :popupId " +
            "ORDER BY CASE WHEN i.type = 'THUMBNAIL' THEN 0 ELSE 1 END, i.sortOrder")
    List<PopupImage> findByPopupIdOrderByTypeThenSortOrder(
            @org.springframework.data.repository.query.Param("popupId") Long popupId);

    // 새 이미지를 넣을 때 정렬순서를 이어붙이기 위한 현재 최대값 조회 (타입별로 따로 관리)
    @org.springframework.data.jpa.repository.Query(
            "SELECT COALESCE(MAX(i.sortOrder), -1) FROM PopupImage i WHERE i.popup.id = :popupId AND i.type = :type")
    Integer findMaxSortOrder(@org.springframework.data.repository.query.Param("popupId") Long popupId,
                             @org.springframework.data.repository.query.Param("type") PopupImageType type);
}