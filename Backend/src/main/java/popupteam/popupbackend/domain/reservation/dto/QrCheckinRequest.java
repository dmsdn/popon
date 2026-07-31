package popupteam.popupbackend.domain.reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class QrCheckinRequest {
    @NotBlank
    private String qrToken;

    // 지금 스캔 중인 화면(현장)이 속한 팝업 ID - 같은 주최자 소유 팝업이라도
    // QR이 다른 팝업 소속이면 거부하기 위한 필수 검증값
    @NotNull
    private Long popupId;
}