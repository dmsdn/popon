package popupteam.popupbackend.domain.venue;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

public interface VenueMeetingRequestRepository extends JpaRepository<VenueMeetingRequest, Long> {
    List<VenueMeetingRequest> findByBusinessIdOrderByCreatedAtDesc(Long businessId);
    List<VenueMeetingRequest> findByStatusOrderByCreatedAtAsc(VenueMeetingStatus status);
    List<VenueMeetingRequest> findAllByOrderByCreatedAtDesc();
}