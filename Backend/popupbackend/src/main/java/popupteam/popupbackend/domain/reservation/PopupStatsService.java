package popupteam.popupbackend.domain.reservation;

import popupteam.popupbackend.domain.reservation.dto.PopupVisitorCountProjection;
import popupteam.popupbackend.domain.reservation.dto.PopupVisitorRankingResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class PopupStatsService {

    private final ReservationRepository reservationRepository;

    public List<PopupVisitorRankingResponse> getVisitorRanking(LocalDate date) {
        List<PopupVisitorCountProjection> results = (date != null)
                ? reservationRepository.findVisitorRankingByDate(date)
                : reservationRepository.findVisitorRankingAllTime();

        return IntStream.range(0, results.size())
                .mapToObj(i -> {
                    PopupVisitorCountProjection p = results.get(i);
                    return PopupVisitorRankingResponse.builder()
                            .rank(i + 1)
                            .popupId(p.getPopupId())
                            .popupTitle(p.getPopupTitle())
                            .companyName(p.getCompanyName())
                            .visitorCount(p.getVisitorCount())
                            .build();
                })
                .collect(Collectors.toList());
    }
}