package popupteam.popupbackend.domain.popup.dto;

import lombok.*;

@Getter @Builder
public class UnifiedCheckinResponse {
    private String source;       // "RESERVATION" 또는 "ONSITE_WAITING"
    private Long refId;
    private String displayName;
    private Integer partySize;
    private String entryStatus;  // 처리 후 상태
}