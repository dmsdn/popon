package popupteam.popupbackend.domain.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class QrCheckinRequest {
    @NotBlank
    private String qrToken;

    // 스캐너 화면에서 선택 중인 팝업 (7/31 추가).
    // 주최자가 팝업을 여러 개 운영할 때 다른 팝업 손님의 QR을 여기서 찍어 버리는 것을 막는다.
    // 필수로 두지 않은 이유: 프론트 배포 전 옛 클라이언트가 남아 있어도 종전대로 동작해야 하기 때문.
    private Long popupId;
}