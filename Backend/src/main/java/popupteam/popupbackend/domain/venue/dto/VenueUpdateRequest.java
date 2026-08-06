package popupteam.popupbackend.domain.venue.dto;

import lombok.Getter;
import java.math.BigDecimal;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

@Getter
public class VenueUpdateRequest {
    private String name;
    private String address;
    private Double areaSqm;
    private BigDecimal rentalFee;
    private String description;
    private String imageUrl;
    private String status; // "AVAILABLE" 또는 "UNAVAILABLE"
    private Double latitude;
    private Double longitude;
}