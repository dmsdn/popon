package popupteam.popupbackend.domain.notice.dto;

import lombok.*;
import popupteam.popupbackend.domain.notice.NoticeRecipient;
import java.time.LocalDateTime;

@Getter @Builder
public class NoticeInboxResponse {
    private Long recipientId;
    private Long noticeId;
    private Long popupId;
    private String popupTitle;
    private String category;
    private String title;
    private String content;
    private LocalDateTime sentAt;
    private boolean read;

    public static NoticeInboxResponse from(NoticeRecipient r) {
        return NoticeInboxResponse.builder()
                .recipientId(r.getId())
                .noticeId(r.getNotice().getId())
                .popupId(r.getNotice().getPopup() != null ? r.getNotice().getPopup().getId() : null)
                .popupTitle(r.getNotice().getPopup() != null ? r.getNotice().getPopup().getTitle() : null)
                .category(r.getNotice().getCategory().name())
                .title(r.getNotice().getTitle())
                .content(r.getNotice().getContent())
                .sentAt(r.getNotice().getSentAt())
                .read(r.getReadAt() != null)
                .build();
    }
}