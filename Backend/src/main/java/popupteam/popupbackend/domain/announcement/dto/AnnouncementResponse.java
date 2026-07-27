package popupteam.popupbackend.domain.announcement.dto;

import lombok.*;
import popupteam.popupbackend.domain.announcement.Announcement;
import java.time.LocalDateTime;

@Getter @Builder
public class AnnouncementResponse {
    private Long id;
    private String title;
    private String content;
    private LocalDateTime createdAt;

    public static AnnouncementResponse from(Announcement a) {
        return AnnouncementResponse.builder()
                .id(a.getId())
                .title(a.getTitle())
                .content(a.getContent())
                .createdAt(a.getCreatedAt())
                .build();
    }
}