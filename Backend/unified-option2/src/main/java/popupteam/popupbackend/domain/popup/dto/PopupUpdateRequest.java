package popupteam.popupbackend.domain.popup.dto;

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

}