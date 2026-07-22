package popupteam.popupbackend.domain.venue.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class VenueMeetingStatusUpdateRequest {
    @NotBlank
    private String status; // "IN_PROGRESS", "CONTRACTED", "CANCELLED"

    private String adminNote;
}