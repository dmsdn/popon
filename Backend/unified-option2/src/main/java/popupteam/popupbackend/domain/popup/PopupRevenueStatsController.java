package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.common.exception.ForbiddenException;
import popupteam.popupbackend.domain.popup.dto.RevenueTrendResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/stats")
@RequiredArgsConstructor
public class PopupRevenueStatsController {

    private final PopupRevenueStatsService popupRevenueStatsService;

    @GetMapping("/revenue")
    public ResponseEntity<List<RevenueTrendResponse>> getRevenueTrend(
            Authentication authentication,
            @RequestParam(defaultValue = "DAILY") RevenueUnit unit,
            @RequestParam(defaultValue = "30") int amount) {

        String name = authentication.getName();
        boolean isAdmin = name != null && name.startsWith("admin:");
        if (!isAdmin) {
            throw new ForbiddenException("관리자만 조회할 수 있습니다.");
        }

        List<RevenueTrendResponse> result = (unit == RevenueUnit.MONTHLY)
                ? popupRevenueStatsService.getMonthlyTrend(amount)
                : popupRevenueStatsService.getDailyTrend(amount);

        return ResponseEntity.ok(result);
    }
}