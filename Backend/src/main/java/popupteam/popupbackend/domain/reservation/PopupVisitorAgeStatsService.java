package popupteam.popupbackend.domain.reservation;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 주최자가 자기 팝업의 방문객 연령 분포를 볼 수 있게 해주는 통계.
 * "예약자"가 아니라 "실제 체크인(입장) 완료한 사람"만 집계 대상으로 삼는다 - 예약만 하고 안 온 사람은 제외.
 * 원본 생년월일은 절대 그대로 넘기지 않고, 여기서 연령대별 집계 숫자로만 변환해서 반환한다 (개인정보 보호).
 */
@Service
@RequiredArgsConstructor
public class PopupVisitorAgeStatsService {

    private final ReservationRepository reservationRepository;
    private final popupteam.popupbackend.domain.popup.PopupRepository popupRepository;
    private final popupteam.popupbackend.domain.popup.PopupClickLogRepository popupClickLogRepository;

    public Map<String, Long> getAgeDistribution(Long popupId) {
        List<LocalDate> birthDates = reservationRepository.findBirthDatesOfCheckedInVisitors(popupId);

        Map<String, Long> distribution = new LinkedHashMap<>();
        distribution.put("10대", 0L);
        distribution.put("20대", 0L);
        distribution.put("30대", 0L);
        distribution.put("40대", 0L);
        distribution.put("50대 이상", 0L);
        distribution.put("미상", 0L);

        LocalDate today = LocalDate.now();
        for (LocalDate birthDate : birthDates) {
            int age = Period.between(birthDate, today).getYears();
            String bucket = toAgeBucket(age);
            distribution.merge(bucket, 1L, Long::sum);
        }

        return distribution;
    }

    private String toAgeBucket(int age) {
        if (age < 10) return "미상";
        if (age < 20) return "10대";
        if (age < 30) return "20대";
        if (age < 40) return "30대";
        if (age < 50) return "40대";
        return "50대 이상";
    }

    public Map<String, Long> getGenderDistribution(Long popupId) {
        List<popupteam.popupbackend.domain.consumer.Customer.Gender> genders =
                reservationRepository.findGendersOfCheckedInVisitors(popupId);

        Map<String, Long> distribution = new LinkedHashMap<>();
        distribution.put("남성", 0L);
        distribution.put("여성", 0L);
        distribution.put("미상", 0L);

        for (popupteam.popupbackend.domain.consumer.Customer.Gender gender : genders) {
            String bucket = switch (gender) {
                case MALE -> "남성";
                case FEMALE -> "여성";
                default -> "미상";
            };
            distribution.merge(bucket, 1L, Long::sum);
        }

        return distribution;
    }

    // 최근 며칠간 날짜별 방문자 수 추이. 방문자가 0명인 날짜도 0으로 채워서 반환 (그래프 끊기지 않게)
    public java.util.List<java.util.Map<String, Object>> getDailyVisitorTrend(Long popupId, int days) {
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(days - 1);

        List<Object[]> rows = reservationRepository.countDailyCheckedInVisitors(
                popupId,
                fromDate.atStartOfDay(),
                today.plusDays(1).atStartOfDay()
        );

        Map<LocalDate, Long> countsByDate = new LinkedHashMap<>();
        for (Object[] row : rows) {
            LocalDate date = (row[0] instanceof LocalDate)
                    ? (LocalDate) row[0]
                    : ((java.sql.Date) row[0]).toLocalDate();
            countsByDate.put(date, (Long) row[1]);
        }

        java.util.List<java.util.Map<String, Object>> trend = new java.util.ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate date = fromDate.plusDays(i);
            java.util.Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", date.toString());
            point.put("visitorCount", countsByDate.getOrDefault(date, 0L));
            trend.add(point);
        }
        return trend;
    }

    // 누적 방문자 + 일평균 방문자. 일평균 = 누적 / (팝업 시작일부터 오늘까지 경과일, 최소 1일)
    public Map<String, Object> getTotalVisitorStats(Long popupId) {
        Long total = reservationRepository.sumVisitorsOfCheckedIn(popupId);

        popupteam.popupbackend.domain.popup.Popup popup = popupRepository.findById(popupId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 팝업입니다."));

        LocalDate startDate = popup.getStartDate().toLocalDate();
        LocalDate today = LocalDate.now();
        LocalDate effectiveStart = startDate.isAfter(today) ? today : startDate; // 아직 시작 전이면 0으로 나누기 방지
        long daysElapsed = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(effectiveStart, today) + 1);

        long dailyAverage = Math.round(total / (double) daysElapsed);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalVisitors", total);
        result.put("dailyAverage", dailyAverage);
        return result;
    }

    // 최근 며칠간 날짜별 예약 건수 (체크인 여부 무관, 취소 제외). visitorCount와 x축 맞추려고 같은 형태로 반환
    public java.util.List<java.util.Map<String, Object>> getDailyReservationTrend(Long popupId, int days) {
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(days - 1);

        List<Object[]> rows = reservationRepository.countDailyReservations(popupId, fromDate, today);

        Map<LocalDate, Long> countsByDate = new LinkedHashMap<>();
        for (Object[] row : rows) {
            countsByDate.put((LocalDate) row[0], (Long) row[1]);
        }

        java.util.List<java.util.Map<String, Object>> trend = new java.util.ArrayList<>();
        for (int i = 0; i < days; i++) {
            LocalDate date = fromDate.plusDays(i);
            java.util.Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", date.toString());
            point.put("reservationCount", countsByDate.getOrDefault(date, 0L));
            trend.add(point);
        }
        return trend;
    }

    // 예약 전환율 = 취소되지 않은 예약 건수 / 팝업 상세페이지 클릭수
    public Map<String, Object> getConversionRate(Long popupId) {
        long reservationCount = reservationRepository.countByPopupIdAndStatus(
                popupId, popupteam.popupbackend.domain.reservation.ReservationStatus.CONFIRMED);
        long clickCount = popupClickLogRepository.countByPopupId(popupId);

        double rate = (clickCount == 0) ? 0.0 : (reservationCount * 100.0 / clickCount);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("reservationCount", reservationCount);
        result.put("clickCount", clickCount);
        result.put("conversionRate", Math.round(rate * 10) / 10.0); // 소수점 1자리
        return result;
    }
}