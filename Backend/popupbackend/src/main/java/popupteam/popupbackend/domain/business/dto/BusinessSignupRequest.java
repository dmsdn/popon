// BusinessSignupRequest.java
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

    private String phone;
}