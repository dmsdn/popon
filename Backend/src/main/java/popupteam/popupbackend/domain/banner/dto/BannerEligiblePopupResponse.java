package popupteam.popupbackend.domain.banner.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.Popup;

@Getter
@Builder
public class BannerEligiblePopupResponse {
    private Long id;
    private String title;
    private String status; // OPEN(진행중) / BEFOR(오픈예정)
    private String thumbnailImageUrl; // 없으면 null - 프론트에서 "썸네일 없음" 등으로 표시하고, 선택은 막아야 함

    public static BannerEligiblePopupResponse of(Popup popup, String thumbnailImageUrl) {
        return BannerEligiblePopupResponse.builder()
                .id(popup.getId())
                .title(popup.getTitle())
                .status(popup.getStatus().name())
                .thumbnailImageUrl(thumbnailImageUrl)
                .build();
    }
}