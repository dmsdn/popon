package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import popupteam.popupbackend.domain.popup.SnsPlatform;

@Getter
public class PopupSnsLinkRequest {

    @NotNull(message = "SNS 종류는 필수입니다.")
    private SnsPlatform platform;

    @NotBlank(message = "SNS URL은 필수입니다.")
    @Size(max = 500, message = "SNS URL은 500자를 초과할 수 없습니다.")
    @Pattern(
            regexp = "^https?://.+$",
            message = "SNS URL은 http:// 또는 https://로 시작해야 합니다."
    )
    private String url;

    @Size(max = 100, message = "표시 이름은 100자를 초과할 수 없습니다.")
    private String displayName;

    private Integer sortOrder;
}