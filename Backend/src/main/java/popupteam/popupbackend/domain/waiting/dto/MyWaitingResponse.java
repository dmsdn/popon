package popupteam.popupbackend.domain.waiting.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Builder
public class MyWaitingResponse {
    private Long waitingId;
    private Long popupId;
    private String popupTitle;
    private Integer teamNumber;
    private Long teamsAhead; // 내 앞에 대기중인 팀 수
    private String status;
    private LocalDateTime registeredAt;
}