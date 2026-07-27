package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
public class PopupUpdateRequest {
    private String title;
    private String description;
    private String location;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String status; // "BEFOR", "OPEN", "CLOSED"
    private Double areaSqm;
    private Integer capacity;
    private String reservationMode; // "SLOT" 또는 "FREE"
    private Integer avgExperienceMinutes;
    private String queueMode; // "PRERESERVATION_ONLY" / "ONSITE_WAITING_ONLY" / "BOTH"
    private List<String> hashtags;

    @Min(1)
    private Integer maxPartySizePerTeam;

}