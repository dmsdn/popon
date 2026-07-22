package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter @Builder
public class RevenueTrendResponse {
    private String period;
    private BigDecimal totalAmount;
}