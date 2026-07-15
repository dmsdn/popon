package popupteam.popupbackend.domain.business.dto;

import lombok.*;
import popupteam.popupbackend.domain.business.Business;

@Getter @Builder
public class BusinessInfoResponse {
    private Long id;
    private String email;
    private String companyName;
    private String businessNumber;
    private String phone;

    public static BusinessInfoResponse from(Business b) {
        return BusinessInfoResponse.builder()
                .id(b.getId())
                .email(b.getEmail())
                .companyName(b.getCompanyName())
                .businessNumber(b.getBusinessNumber())
                .phone(b.getPhone())
                .build();
    }
}