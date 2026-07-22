package popupteam.popupbackend.domain.reservation.dto;

import lombok.*;

@Getter @Builder
public class PopupVisitorRankingResponse {
    private Integer rank;
    private Long popupId;
    private String popupTitle;
    private String companyName;
    private Long visitorCount;
}