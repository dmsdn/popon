package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class ContractStageUpdateRequest {
    @NotBlank
    private String stage; // "IN_CONSTRUCTION" 또는 "SETTLED"
}