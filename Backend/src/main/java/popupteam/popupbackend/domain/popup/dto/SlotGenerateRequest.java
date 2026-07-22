package popupteam.popupbackend.domain.popup.dto;

import lombok.Getter;

@Getter
public class SlotGenerateRequest {
    private Integer perSlotCapacity; // 선택. 없으면 서비스에서 폴백 처리
}