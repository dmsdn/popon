package popupteam.popupbackend.domain.banner.dto;

import lombok.*;
import popupteam.popupbackend.domain.banner.Banner;
import java.time.LocalDateTime;

@Getter @Builder
public class BannerResponse {
    private Long id;
    private String title;
    private String imageUrl;
    private String linkUrl;
    private Long popupId;
    private Integer sortOrder;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean active;

    public static BannerResponse from(Banner b) {
        return BannerResponse.builder()
                .id(b.getId())
                .title(b.getTitle())
                .imageUrl(b.getImageUrl())
                .linkUrl(b.getLinkUrl())
                .popupId(b.getPopupId())
                .sortOrder(b.getSortOrder())
                .startDate(b.getStartDate())
                .endDate(b.getEndDate())
                .active(b.getActive())
                .build();
    }
}