package popupteam.popupbackend.domain.business.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.business.Business;

// 소비자에게 공개되는 브랜드(사업자) 정보 - 이메일/사업자등록번호 등 민감정보는 절대 포함하지 않음
@Getter
@Builder
public class BusinessBrandResponse {
    private Long id;
    private String companyName;
    private String profileImage;

    public static BusinessBrandResponse from(Business b) {
        return BusinessBrandResponse.builder()
                .id(b.getId())
                .companyName(b.getCompanyName())
                .profileImage(b.getProfileImage())
                .build();
    }
}