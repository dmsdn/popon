package popupteam.popupbackend.domain.report;

import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import popupteam.popupbackend.domain.report.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewReportService {

    private final ReviewReportRepository reviewReportRepository;
    private final CustomerRepository customerRepository;
    private final ReviewRefRepository reviewRefRepository;

    public ReportResponse create(Long reporterCustomerId, ReportCreateRequest request) {
        Customer reporter = customerRepository.findById(reporterCustomerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        if (!reviewRefRepository.existsById(request.getReviewId())) {
            throw new IllegalArgumentException("존재하지 않는 리뷰입니다.");
        }

        ReviewReport report = new ReviewReport();
        report.setReviewId(request.getReviewId());
        report.setReporter(reporter);
        report.setReason(ReportReason.valueOf(request.getReason()));
        report.setDetail(request.getDetail());

        return ReportResponse.from(reviewReportRepository.save(report));
    }

    public List<ReportResponse> getAll(ReportStatus status) {
        List<ReviewReport> reports = (status != null)
                ? reviewReportRepository.findByStatusOrderByCreatedAtAsc(status)
                : reviewReportRepository.findAllByOrderByCreatedAtDesc();

        return reports.stream().map(ReportResponse::from).collect(Collectors.toList());
    }

    public ReportResponse process(Long reportId, String adminEmail) {
        ReviewReport report = reviewReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 신고입니다."));

        report.setStatus(ReportStatus.PROCESSED);
        report.setProcessedBy(adminEmail);
        report.setProcessedAt(LocalDateTime.now());

        return ReportResponse.from(reviewReportRepository.save(report));
    }

    public long countPending() {
        return reviewReportRepository.countByStatus(ReportStatus.PENDING);
    }
}