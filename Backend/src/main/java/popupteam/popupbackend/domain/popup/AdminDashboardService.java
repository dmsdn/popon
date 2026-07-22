package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.business.BusinessRepository;
import popupteam.popupbackend.domain.customer.CustomerRepository;
import popupteam.popupbackend.domain.cs.CsRequestService;
import popupteam.popupbackend.domain.inquiry.OrganizerInquiryService;
import popupteam.popupbackend.domain.popup.dto.AdminDashboardResponse;
import popupteam.popupbackend.domain.report.ReviewReportService;
import popupteam.popupbackend.domain.visit.PlatformVisitLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final PopupRepository popupRepository;
    private final BusinessRepository businessRepository;
    private final CustomerRepository customerRepository;
    private final OrganizerInquiryService organizerInquiryService;
    private final CsRequestService csRequestService;
    private final ReviewReportService reviewReportService;
    private final PlatformVisitLogService platformVisitLogService;
    private final PopupRevenueStatsService popupRevenueStatsService;

    public AdminDashboardResponse getSummary() {
        return AdminDashboardResponse.builder()
                .pendingPopupCount(popupRepository.countByStatus(PopupStatus.PENDING))
                .openPopupCount(popupRepository.countByStatus(PopupStatus.OPEN))
                .totalCustomerCount(customerRepository.countByWithdrawnFalse())
                .activePartnerCount(businessRepository.count())
                .pendingInquiryCount(organizerInquiryService.countPending())
                .pendingCsCount(csRequestService.countPending())
                .pendingReportCount(reviewReportService.countPending())
                .visitTrend(platformVisitLogService.getTrend(49))
                .revenueTrend(popupRevenueStatsService.getDailyTrend(30))
                .build();
    }
}