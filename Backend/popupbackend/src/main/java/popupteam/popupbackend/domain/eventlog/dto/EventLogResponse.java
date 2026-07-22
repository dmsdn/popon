package popupteam.popupbackend.domain.eventlog.dto;

import lombok.*;
import popupteam.popupbackend.domain.eventlog.TransactionEventLog;
import java.time.LocalDateTime;

@Getter @Builder
public class EventLogResponse {
    private Long id;
    private String entityType;
    private Long entityId;
    private String eventType;
    private String actor;
    private String memo;
    private LocalDateTime createdAt;

    public static EventLogResponse from(TransactionEventLog e) {
        return EventLogResponse.builder()
                .id(e.getId())
                .entityType(e.getEntityType())
                .entityId(e.getEntityId())
                .eventType(e.getEventType())
                .actor(e.getActor())
                .memo(e.getMemo())
                .createdAt(e.getCreatedAt())
                .build();
    }
}