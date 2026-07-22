package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class PopupCreateRequest {
    @NotBlank
    private String title;

    @NotBlank
    private String description;

    private String location;

    private LocalDateTime startDate;

    private LocalDateTime endDate;

    private Double areaSqm; // 매장 면적(㎡), 선택 입력

    private Integer capacity; // 동시 수용인원 직접 입력 시 (안 주면 areaSqm 기반 자동계산값 사용)

    @NotBlank
    private String reservationMode; // "SLOT" 또는 "FREE"

    @NotNull
    private Integer avgExperienceMinutes; // 체험 소요시간(분), 필수
}