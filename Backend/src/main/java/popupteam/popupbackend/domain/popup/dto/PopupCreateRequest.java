package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import java.time.LocalDateTime;
import java.util.List;

@Getter
public class PopupCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String description;

    private String location;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Double areaSqm;

    private Integer capacity;

    private Long addressKeywordId; // 관심지역 매칭용 Region ID (선택입력)

    @NotBlank
    private String reservationMode; // "SLOT" 또는 "FREE"

    @NotNull
    private Integer avgExperienceMinutes;

    @NotBlank
    private String queueMode; // "PRERESERVATION_ONLY" / "ONSITE_WAITING_ONLY" / "BOTH"

    @Min(1)
    private Integer maxPartySizePerTeam; // 현장웨이팅 팀당 최대 인원, 선택입력 (안 주면 제한 없음)

    private List<String> hashtags;

    private String notice; // 팝업 상세페이지 공지사항 (선택입력)

    private List<Long> keywordIds; // 표준 키워드 ID 목록 (선택)
}