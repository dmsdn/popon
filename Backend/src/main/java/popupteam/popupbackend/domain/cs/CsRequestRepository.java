package popupteam.popupbackend.domain.cs;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CsRequestRepository extends JpaRepository<CsRequest, Long> {
    List<CsRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<CsRequest> findByStatusOrderByCreatedAtAsc(CsStatus status);
    List<CsRequest> findAllByOrderByCreatedAtDesc();
    long countByStatus(CsStatus status);
}
