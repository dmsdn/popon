package popupteam.popupbackend.domain.business.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.business.Business;
import java.time.LocalDateTime;

@Getter
@Builder
public class BusinessListResponse {
    private Long id;
    private String email;
    private String companyName;
    private String businessNumber;
    private String phone;
    private String profileImage;
    private LocalDateTime createdAt;

    public static BusinessListResponse from(Business business) {
        return BusinessListResponse.builder()
                .id(business.getId())
                .email(business.getEmail())
                .companyName(business.getCompanyName())
                .businessNumber(business.getBusinessNumber())
                .phone(business.getPhone())
                .profileImage(business.getProfileImage())
                .createdAt(business.getCreatedAt())
                .build();
    }
}