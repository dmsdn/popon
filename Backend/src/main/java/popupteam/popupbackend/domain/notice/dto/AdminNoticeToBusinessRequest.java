package popupteam.popupbackend.domain.notice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class AdminNoticeToBusinessRequest {
    @NotNull
    private Long businessId;

    private Long popupId; // 특정 팝업 관련 공지면 입력, 아니면 null

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}