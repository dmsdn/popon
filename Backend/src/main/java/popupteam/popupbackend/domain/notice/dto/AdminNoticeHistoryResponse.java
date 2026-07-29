package popupteam.popupbackend.domain.notice.dto;

import lombok.*;
import popupteam.popupbackend.domain.notice.NoticeRecipient;
import java.time.LocalDateTime;

@Getter @Builder
public class AdminNoticeHistoryResponse {
    private Long noticeId;
    private Long targetBusinessId; // 어느 주최자에게 보냈는지
    private Long popupId;          // 특정 팝업과 관련된 공지면 값 있음, 일반 공지면 null
    private String popupTitle;
    private String title;
    private String content;
    private String sentBy;         // 발송한 관리자 이메일
    private LocalDateTime sentAt;
    private boolean read;          // 그 주최자가 읽었는지 여부

    public static AdminNoticeHistoryResponse from(NoticeRecipient r) {
        return AdminNoticeHistoryResponse.builder()
                .noticeId(r.getNotice().getId())
                .targetBusinessId(r.getRecipientId())
                .popupId(r.getNotice().getPopup() != null ? r.getNotice().getPopup().getId() : null)
                .popupTitle(r.getNotice().getPopup() != null ? r.getNotice().getPopup().getTitle() : null)
                .title(r.getNotice().getTitle())
                .content(r.getNotice().getContent())
                .sentBy(r.getNotice().getSentBy())
                .sentAt(r.getNotice().getSentAt())
                .read(r.getReadAt() != null)
                .build();
    }
}