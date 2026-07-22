package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import popupteam.popupbackend.domain.popup.PopupContract;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Builder
public class ContractResponse {
    private Long popupId;
    private String popupTitle;
    private BigDecimal contractAmount;
    private String memo;
    private String stage;
    private String registeredBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ContractResponse from(PopupContract c) {
        return ContractResponse.builder()
                .popupId(c.getPopup().getId())
                .popupTitle(c.getPopup().getTitle())
                .contractAmount(c.getContractAmount())
                .memo(c.getMemo())
                .stage(c.getStage().name())
                .registeredBy(c.getRegisteredBy())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}