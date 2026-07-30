package popupteam.popupbackend.domain.report;

import popupteam.popupbackend.domain.customer.Customer;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import popupteam.popupbackend.domain.notice.NoticeService;
import popupteam.popupbackend.domain.report.dto.*;
import popupteam.popupbackend.domain.review.Review;
import popupteam.popupbackend.domain.review.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewReportService {

    private final ReviewReportRepository reviewReportRepository;
    private final CustomerRepository customerRepository;
    private final ReviewRepository reviewRepository;
    private final NoticeService noticeService;

    public ReportResponse create(Long reporterCustomerId, ReportCreateRequest request) {
        Customer reporter = customerRepository.findById(reporterCustomerId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 소비자입니다."));

        Review review = reviewRepository.findById(request.getReviewId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 리뷰입니다."));

        if (review.getCustomerId().equals(reporterCustomerId)) {
            throw new IllegalArgumentException("본인이 작성한 후기는 신고할 수 없습니다.");
        }

        ReviewReport report = new ReviewReport();
        report.setReviewId(request.getReviewId());
        report.setReporter(reporter);
        report.setReason(ReportReason.valueOf(request.getReason()));
        report.setDetail(request.getDetail());

        try {
            report = reviewReportRepository.save(report);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("이미 이 후기를 신고하셨습니다.");
        }

        return ReportResponse.from(report, review);
    }

    public List<ReportResponse> getAll(ReportStatus status) {
        List<ReviewReport> reports = (status != null)
                ? reviewReportRepository.findByStatusOrderByCreatedAtAsc(status)
                : reviewReportRepository.findAllByOrderByCreatedAtDesc();

        return reports.stream()
                .map(r -> ReportResponse.from(r, reviewRepository.findById(r.getReviewId()).orElse(null)))
                .collect(Collectors.toList());
    }

    // 반려 - 신고가 부적절하다고 판단, 후기는 손대지 않음
    public ReportResponse reject(Long reportId, String adminEmail) {
        ReviewReport report = reviewReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 신고입니다."));

        report.setStatus(ReportStatus.REJECTED);
        report.setProcessedBy(adminEmail);
        report.setProcessedAt(LocalDateTime.now());
        reviewReportRepository.save(report);

        Review review = reviewRepository.findById(report.getReviewId()).orElse(null);
        return ReportResponse.from(report, review);
    }

    // 후기 가리기 - 신고를 받아들여서 후기 내용을 마스킹 처리 (별점·존재는 유지), 작성자 본인에게만 알림
    public ReportResponse hideReview(Long reportId, String adminEmail) {
        ReviewReport report = reviewReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 신고입니다."));

        report.setStatus(ReportStatus.HIDDEN);
        report.setProcessedBy(adminEmail);
        report.setProcessedAt(LocalDateTime.now());
        reviewReportRepository.save(report);

        Review review = reviewRepository.findById(report.getReviewId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 리뷰입니다."));
        review.setHidden(true);
        reviewRepository.save(review);

        noticeService.notifyReviewHidden(review.getPopupId(), review.getCustomerId());

        return ReportResponse.from(report, review);
    }

    public long countPending() {
        return reviewReportRepository.countByStatus(ReportStatus.PENDING);
    }
}