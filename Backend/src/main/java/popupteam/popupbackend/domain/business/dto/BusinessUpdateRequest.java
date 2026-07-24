package popupteam.popupbackend.domain.business.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Getter;

@Getter
public class BusinessUpdateRequest {
    private String companyName;

    @Pattern(regexp = "^01[0-9]{8,9}$", message = "연락처는 숫자만 입력 가능하며, 01로 시작하는 10~11자리여야 합니다.")
    private String phone;
}