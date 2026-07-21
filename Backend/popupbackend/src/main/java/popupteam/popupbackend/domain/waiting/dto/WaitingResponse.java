package popupteam.popupbackend.domain.waiting.dto;

import lombok.*;
import popupteam.popupbackend.domain.waiting.WaitingQueue;
import java.time.LocalDateTime;

@Getter @Builder
public class WaitingResponse {
    private Long id;
    private Long popupId;
    private Long customerId;
    private String name;
    private String email;
    private String phoneNumber;
    private Integer partySize;
    private Integer teamNumber;
    private String qrToken;
    private String status;
    private Long teamsAhead;
    private LocalDateTime registeredAt;
    private LocalDateTime calledAt;
    private LocalDateTime callExpiresAt;
    private LocalDateTime enteredAt;
    private String source; // "RESERVATION" 또는 "ONSITE_WAITING" (통합 조회용)

    public static WaitingResponse from(WaitingQueue w, Long teamsAhead) {
        return WaitingResponse.builder()
                .id(w.getId())
                .popupId(w.getPopup().getId())
                .customerId(w.getCustomer() != null ? w.getCustomer().getId() : null)
                .name(w.getName())
                .email(w.getEmail())
                .phoneNumber(w.getPhoneNumber())
                .partySize(w.getPartySize())
                .teamNumber(w.getTeamNumber())
                .qrToken(w.getQrToken())
                .status(w.getStatus().name())
                .teamsAhead(teamsAhead)
                .registeredAt(w.getRegisteredAt())
                .calledAt(w.getCalledAt())
                .callExpiresAt(w.getCallExpiresAt())
                .enteredAt(w.getEnteredAt())
                .source("ONSITE_WAITING")
                .build();
    }
}