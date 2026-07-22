package popupteam.popupbackend.domain.venue.dto;

import lombok.*;
import popupteam.popupbackend.domain.venue.Venue;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Builder
public class VenueResponse {
    private Long id;
    private String name;
    private String address;
    private Double areaSqm;
    private BigDecimal rentalFee;
    private String description;
    private String imageUrl;
    private String status;
    private LocalDateTime createdAt;
    private Double latitude;
    private Double longitude;

    public static VenueResponse from(Venue v) {
        return VenueResponse.builder()
                .id(v.getId())
                .name(v.getName())
                .address(v.getAddress())
                .areaSqm(v.getAreaSqm())
                .rentalFee(v.getRentalFee())
                .description(v.getDescription())
                .imageUrl(v.getImageUrl())
                .status(v.getStatus().name())
                .createdAt(v.getCreatedAt())
                .latitude(v.getLatitude())
                .longitude(v.getLongitude())
                .build();
    }
}