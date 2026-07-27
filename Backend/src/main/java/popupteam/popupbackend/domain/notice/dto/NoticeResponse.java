package popupteam.popupbackend.domain.notice.dto;

import lombok.*;
import popupteam.popupbackend.domain.notice.Notice;
import java.time.LocalDateTime;

@Getter @Builder
public class NoticeResponse {
    private Long id;
    private Long popupId;
    private String category;
    private String title;
    private String content;
    private Integer recipientCount;
    private String sentBy;
    private LocalDateTime sentAt;

    public static NoticeResponse from(Notice n) {
        return NoticeResponse.builder()
                .id(n.getId())
                .popupId(n.getPopup() != null ? n.getPopup().getId() : null)
                .category(n.getCategory().name())
                .title(n.getTitle())
                .content(n.getContent())
                .recipientCount(n.getRecipientCount())
                .sentBy(n.getSentBy())
                .sentAt(n.getSentAt())
                .build();
    }
}