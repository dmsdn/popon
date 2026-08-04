package popupteam.popupbackend.domain.popup.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Builder
public class UnifiedQueueEntryResponse {
    private String source;       // "RESERVATION" 또는 "ONSITE_WAITING"
    private Long refId;          // 원본 테이블의 ID (reservation.id 또는 waiting_queue.id)
    private String displayName;  // 화면에 보여줄 이름 (닉네임 또는 이름 또는 전화번호 일부)
    private String phoneNumber;
    private Integer partySize;
    private String qrToken;
    private String entryStatus;  // 공통 상태값으로 통일: WAITING/CALLED/CHECKED_IN/NO_SHOW/CANCELLED 등
    private String cancelReason; // 웨이팅 취소 사유 (8/4) — 자정 리셋분은 "미입장", 직접 취소는 null
    private LocalDateTime joinedAt; // 예약자는 슬롯 시작시각(입장 후에는 입장시각), 웨이팅자는 등록시각(입장 후에는 입장시각)
}