package popupteam.popupbackend.domain.business.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class BusinessSignupRequest {
    @Email @NotBlank
    private String email;

    @NotBlank @Size(min = 8)
    private String password;

    @NotBlank
    private String companyName;

    @NotBlank
    @Pattern(regexp = "\\d{3}-\\d{2}-\\d{5}", message = "사업자번호 형식은 000-00-00000 입니다.")
    private String businessNumber;

    @NotBlank
    @Pattern(regexp = "^01[0-9]{8,9}$", message = "연락처는 숫자만 입력 가능하며, 01로 시작하는 10~11자리여야 합니다.")
    private String phone;

    @AssertTrue(message = "개인정보 수집·이용에 동의해야 가입할 수 있습니다.")
    private boolean agreeTerms;
}