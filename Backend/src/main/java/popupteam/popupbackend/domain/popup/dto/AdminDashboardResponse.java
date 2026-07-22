package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import popupteam.popupbackend.domain.visit.dto.DailyVisitCountResponse;
import java.util.List;

@Getter @Builder
public class AdminDashboardResponse {
    private long pendingPopupCount;
    private long openPopupCount;
    private long totalCustomerCount;
    private long activePartnerCount;
    private long pendingInquiryCount;
    private long pendingCsCount;
    private long pendingReportCount;

    private List<DailyVisitCountResponse> visitTrend;
    private List<RevenueTrendResponse> revenueTrend;
}