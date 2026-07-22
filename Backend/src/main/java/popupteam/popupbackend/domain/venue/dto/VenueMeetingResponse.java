package popupteam.popupbackend.domain.venue.dto;

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