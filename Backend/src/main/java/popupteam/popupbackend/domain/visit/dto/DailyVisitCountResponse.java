package popupteam.popupbackend.domain.visit.dto;

import lombok.*;
import java.time.LocalDate;

@Getter @Builder
public class DailyVisitCountResponse {
    private LocalDate date;
    private Long count;
}