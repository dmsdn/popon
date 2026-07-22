package popupteam.popupbackend.domain.popup.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import java.math.BigDecimal;

@Getter
public class ContractSetRequest {
    @NotNull @DecimalMin(value = "0", inclusive = true)
    private BigDecimal contractAmount;

    private String memo;
}