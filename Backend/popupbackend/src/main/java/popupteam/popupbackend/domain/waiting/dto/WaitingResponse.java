package popupteam.popupbackend.domain.waiting.dto;

import lombok.*;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import java.time.LocalDateTime;

@Getter @Builder
public class WaitingResponse {
    private Long id;
    private Long popupId;
    private String phoneNumber;
    private Integer partySize;
    private Integer teamNumber;
    private String status;
    private Long teamsAhead; // 내 앞에 대기중인 팀 수
    private LocalDateTime registeredAt;
    private LocalDateTime calledAt;
    private LocalDateTime callExpiresAt;
    private LocalDateTime enteredAt;

    public static WaitingResponse from(WaitingQueue w, Long teamsAhead) {
        return WaitingResponse.builder()
                .id(w.getId())
                .popupId(w.getPopup().getId())
                .phoneNumber(w.getPhoneNumber())
                .partySize(w.getPartySize())
                .teamNumber(w.getTeamNumber())
                .status(w.getStatus().name())
                .teamsAhead(teamsAhead)
                .registeredAt(w.getRegisteredAt())
                .calledAt(w.getCalledAt())
                .callExpiresAt(w.getCallExpiresAt())
                .enteredAt(w.getEnteredAt())
                .build();
    }
}