package popupteam.popupbackend.domain.business.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;

@Getter
public class PasswordChangeRequest {
    @NotBlank
    private String currentPassword;

    @NotBlank @Size(min = 8)
    private String newPassword;
}