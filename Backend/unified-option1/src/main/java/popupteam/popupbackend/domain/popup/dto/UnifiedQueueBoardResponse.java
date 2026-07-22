package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.util.List;

@Getter @Builder
public class UnifiedQueueBoardResponse {
    private Long popupId;
    private int totalCount;
    private List<UnifiedQueueEntryResponse> entries;
}