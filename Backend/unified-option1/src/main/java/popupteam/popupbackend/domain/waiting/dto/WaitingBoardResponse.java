package popupteam.popupbackend.domain.waiting.dto;

import lombok.*;
import java.util.List;

@Getter @Builder
public class WaitingBoardResponse {
    private Long popupId;
    private int totalWaitingTeams;
    private List<WaitingResponse> waitingList; // 대기중인 팀 목록 (순서대로)
}