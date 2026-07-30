package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PopupOperatingHoursRepository extends JpaRepository<PopupOperatingHours, Long> {
    List<PopupOperatingHours> findByPopupIdOrderByDayOfWeek(Long popupId);
    void deleteByPopupId(Long popupId);

    // 목록/검색 화면에서 여러 팝업의 운영시간을 한 번에 조회할 때 대비 (N+1 방지용, 지금은 상세조회에서만 씀)
    List<PopupOperatingHours> findByPopupIdIn(List<Long> popupIds);
}