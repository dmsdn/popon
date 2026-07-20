package popupteam.popupbackend.domain.venue.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import java.math.BigDecimal;

@Getter
public class VenueCreateRequest {
    @NotBlank
    private String name;

    @NotBlank
    private String address;

    private Double areaSqm;
    private BigDecimal rentalFee;
    private String description;
    private String imageUrl;
}