package popupteam.popupbackend.domain.announcement.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class AnnouncementCreateRequest {
    @NotBlank
    private String title;

    private String content;
}