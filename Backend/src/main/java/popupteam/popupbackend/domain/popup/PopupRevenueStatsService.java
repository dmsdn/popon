package popupteam.popupbackend.domain.popup;

import popupteam.popupbackend.domain.popup.dto.RevenueTrendResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class PopupRevenueStatsService {

    private final PopupContractRepository popupContractRepository;

    public List<RevenueTrendResponse> getDailyTrend(int days) {
        LocalDate fromDate = LocalDate.now().minusDays(days - 1L);
        LocalDateTime fromDateTime = fromDate.atStartOfDay();

        Map<String, BigDecimal> map = popupContractRepository.sumDailyRevenueSince(fromDateTime).stream()
                .collect(Collectors.toMap(
                        PopupContractRepository.RevenueProjection::getPeriod,
                        PopupContractRepository.RevenueProjection::getTotal
                ));

        return IntStream.range(0, days)
                .mapToObj(fromDate::plusDays)
                .map(date -> RevenueTrendResponse.builder()
                        .period(date.toString())
                        .totalAmount(map.getOrDefault(date.toString(), BigDecimal.ZERO))
                        .build())
                .collect(Collectors.toList());
    }

    public List<RevenueTrendResponse> getMonthlyTrend(int months) {
        YearMonth fromMonth = YearMonth.now().minusMonths(months - 1L);
        LocalDateTime fromDateTime = fromMonth.atDay(1).atStartOfDay();

        Map<String, BigDecimal> map = popupContractRepository.sumMonthlyRevenueSince(fromDateTime).stream()
                .collect(Collectors.toMap(
                        PopupContractRepository.RevenueProjection::getPeriod,
                        PopupContractRepository.RevenueProjection::getTotal
                ));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");

        return IntStream.range(0, months)
                .mapToObj(fromMonth::plusMonths)
                .map(ym -> RevenueTrendResponse.builder()
                        .period(ym.format(fmt))
                        .totalAmount(map.getOrDefault(ym.format(fmt), BigDecimal.ZERO))
                        .build())
                .collect(Collectors.toList());
    }
}