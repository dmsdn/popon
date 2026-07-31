package popupteam.popupbackend.domain.waiting.dto;

import lombok.Builder;
import lombok.Getter;
import popupteam.popupbackend.domain.waiting.WaitingQueue;

/**
 * QR 토큰으로 조회하는 대기 상태 (7/31 신설).
 *
 * 손님이 문자로 받은 /qr/{token} 화면이 폴링하는 응답이다.
 * **인증 없이 열리는 엔드포인트**라 개인정보를 담지 않는다 —
 * WaitingResponse에는 이름·이메일·연락처가 들어 있어 그대로 쓸 수 없었다.
 *
 * 담는 것은 그 화면이 실제로 그리는 값뿐이다.
 */
@Getter
@Builder
public class WaitingQrStatusResponse {

    private Long popupId;
    private String popupTitle;
    private Integer teamNumber;   // 내 대기번호
    private Integer partySize;
    private String status;        // WAITING · CALLED · ENTERED · CANCELLED
    private Long teamsAhead;      // 앞에 남은 팀 수 (입장·취소 후에는 의미 없음)

    public static WaitingQrStatusResponse from(WaitingQueue w, Long teamsAhead) {
        return WaitingQrStatusResponse.builder()
                .popupId(w.getPopup() != null ? w.getPopup().getId() : null)
                .popupTitle(w.getPopup() != null ? w.getPopup().getTitle() : null)
                .teamNumber(w.getTeamNumber())
                .partySize(w.getPartySize())
                .status(w.getStatus() != null ? w.getStatus().name() : null)
                .teamsAhead(teamsAhead)
                .build();
    }
}
