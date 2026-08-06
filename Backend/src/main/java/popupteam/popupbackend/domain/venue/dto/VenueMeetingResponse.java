package popupteam.popupbackend.domain.venue.dto;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

import lombok.*;
import popupteam.popupbackend.domain.venue.VenueMeetingRequest;
import java.time.LocalDateTime;

@Getter @Builder
public class VenueMeetingResponse {
    private Long id;
    private Long venueId;
    private String venueName;
    private Long businessId;
    private String companyName;
    private String message;
    private String status;
    private String adminNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static VenueMeetingResponse from(VenueMeetingRequest r) {
        return VenueMeetingResponse.builder()
                .id(r.getId())
                .venueId(r.getVenue().getId())
                .venueName(r.getVenue().getName())
                .businessId(r.getBusiness().getId())
                .companyName(r.getBusiness().getCompanyName())
                .message(r.getMessage())
                .status(r.getStatus().name())
                .adminNote(r.getAdminNote())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}