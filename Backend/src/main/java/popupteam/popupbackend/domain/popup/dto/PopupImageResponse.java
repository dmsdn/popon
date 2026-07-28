package popupteam.popupbackend.domain.popup.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.PopupImage;

@Getter
@Builder
public class PopupImageResponse {
    private Long id;
    private String imageUrl;
    private String type;
    private Integer sortOrder;

    public static PopupImageResponse from(PopupImage image) {
        return PopupImageResponse.builder()
                .id(image.getId())
                .imageUrl(image.getImageUrl())
                .type(image.getType().name())
                .sortOrder(image.getSortOrder())
                .build();
    }
}