package popupteam.popupbackend.domain.venue.dto;

import lombok.Getter;
import java.math.BigDecimal;

@Getter
public class VenueUpdateRequest {
    private String name;
    private String address;
    private Double areaSqm;
    private BigDecimal rentalFee;
    private String description;
    private String imageUrl;
    private String status; // "AVAILABLE" 또는 "UNAVAILABLE"
}