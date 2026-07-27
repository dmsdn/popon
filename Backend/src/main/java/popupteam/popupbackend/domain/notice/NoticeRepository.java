package popupteam.popupbackend.domain.notice;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByPopupIdOrderBySentAtDesc(Long popupId);

    // 자동알림 중복 발송 방지용 (같은 팝업+같은 제목으로 최근에 이미 보냈으면 스킵)
    boolean existsByPopupIdAndTitleAndSentAtAfter(Long popupId, String title, LocalDateTime after);
}