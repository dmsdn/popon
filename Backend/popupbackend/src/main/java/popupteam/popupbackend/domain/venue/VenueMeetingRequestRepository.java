package popupteam.popupbackend.domain.venue;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VenueMeetingRequestRepository extends JpaRepository<VenueMeetingRequest, Long> {
    List<VenueMeetingRequest> findByBusinessIdOrderByCreatedAtDesc(Long businessId);
    List<VenueMeetingRequest> findByStatusOrderByCreatedAtAsc(VenueMeetingStatus status);
    List<VenueMeetingRequest> findAllByOrderByCreatedAtDesc();
}