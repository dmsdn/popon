package popupteam.popupbackend.domain.popup.dto;

import lombok.*;

@Getter @Builder
public class PopularPopupResponse {
    private Long popupId;
    private String title;
    private String companyName;
    private long wishlistCount;
    private long reviewCount;
    private long clickCount;
    private long totalScore;
}