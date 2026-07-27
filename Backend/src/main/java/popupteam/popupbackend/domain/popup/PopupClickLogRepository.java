package popupteam.popupbackend.domain.popup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PopupClickLogRepository extends JpaRepository<PopupClickLog, Long> {

    // 인기 팝업 랭킹 계산용 - 팝업별 클릭수를 한 번에 집계
    @Query("SELECT c.popupId, COUNT(c) FROM PopupClickLog c GROUP BY c.popupId")
    List<Object[]> countAllGroupByPopupId();
}