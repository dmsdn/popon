package popupteam.popupbackend.domain.visit;

import popupteam.popupbackend.domain.visit.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class PlatformVisitLogService {

    private final PlatformVisitLogRepository platformVisitLogRepository;

    public void logVisit(VisitLogRequest request) {
        AppSource appSource = AppSource.valueOf(request.getAppSource());
        LocalDate today = LocalDate.now();

        boolean alreadyLogged = platformVisitLogRepository
                .existsByVisitorKeyAndVisitDateAndAppSource(request.getVisitorKey(), today, appSource);

        if (alreadyLogged) return;

        PlatformVisitLog log = new PlatformVisitLog();
        log.setVisitorKey(request.getVisitorKey());
        log.setAppSource(appSource);
        log.setVisitDate(today);
        platformVisitLogRepository.save(log);
    }

    public List<DailyVisitCountResponse> getTrend(int days) {
        LocalDate fromDate = LocalDate.now().minusDays(days - 1L);

        Map<LocalDate, Long> countMap = platformVisitLogRepository.countDailyVisitsSince(fromDate).stream()
                .collect(Collectors.toMap(
                        PlatformVisitLogRepository.DailyCountProjection::getDate,
                        PlatformVisitLogRepository.DailyCountProjection::getCount
                ));

        return IntStream.range(0, days)
                .mapToObj(fromDate::plusDays)
                .map(date -> DailyVisitCountResponse.builder()
                        .date(date)
                        .count(countMap.getOrDefault(date, 0L))
                        .build())
                .collect(Collectors.toList());
    }
}