package popupteam.popupbackend.domain.popup.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.PopupSnsLink;
import popupteam.popupbackend.domain.popup.SnsPlatform;

@Getter
@Builder
public class PopupSnsLinkResponse {

    private Long id;
    private SnsPlatform platform;
    private String url;
    private String displayName;
    private Integer sortOrder;

    public static PopupSnsLinkResponse from(PopupSnsLink link) {
        return PopupSnsLinkResponse.builder()
                .id(link.getId())
                .platform(link.getPlatform())
                .url(link.getUrl())
                .displayName(link.getDisplayName())
                .sortOrder(link.getSortOrder())
                .build();
    }
}