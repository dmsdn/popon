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
}