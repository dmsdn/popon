package popupteam.popupbackend.domain.report;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    List<ReviewReport> findByStatusOrderByCreatedAtAsc(ReportStatus status);
    List<ReviewReport> findAllByOrderByCreatedAtDesc();
    long countByStatus(ReportStatus status);
}