package popupteam.popupbackend.domain.venue.dto;

// [기능 탈락] 파트너 공간 탐색,대관 미팅 프론트 기획 단계에서 빠져서, 이 도메인 전체가 호출부 없이 남아있음 (백엔드 로직은 완성)

import lombok.Getter;

@Getter
public class VenueMeetingCreateRequest {
    private String message; // 선택 (신청 메모)
}