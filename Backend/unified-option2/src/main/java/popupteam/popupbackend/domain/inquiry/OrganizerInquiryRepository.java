package popupteam.popupbackend.domain.inquiry;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrganizerInquiryRepository extends JpaRepository<OrganizerInquiry, Long> {
    List<OrganizerInquiry> findByBusinessIdOrderByCreatedAtDesc(Long businessId);
    List<OrganizerInquiry> findByStatusOrderByCreatedAtAsc(InquiryStatus status);
    List<OrganizerInquiry> findAllByOrderByCreatedAtDesc();
    long countByStatus(InquiryStatus status);
}