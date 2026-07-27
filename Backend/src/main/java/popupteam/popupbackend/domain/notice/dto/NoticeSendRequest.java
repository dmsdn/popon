package popupteam.popupbackend.domain.notice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import java.util.List;

@Getter
public class NoticeSendRequest {
    @NotEmpty(message = "발송 대상을 1개 이상 선택해야 합니다.")
    private List<String> targets; // "ALL_RESERVED", "TODAY_RESERVED", "ONSITE_WAITING", "WISHLIST"

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}