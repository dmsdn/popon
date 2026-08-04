package popupteam.popupbackend.domain.banner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class BannerFromPopupRequest {
    @NotNull
    private Long popupId;

    @NotBlank
    private String title; // 관리자가 직접 입력. 이미지·상세페이지 링크는 팝업에서 자동으로 가져옴

    // 선택 - 안 넣으면 배너 목록 맨 뒤에 추가
    private Integer sortOrder;
}