package popupteam.popupbackend.domain.popup;

public enum PopupStatus {
    PENDING,  // 심사 대기 (등록 직후 기본값)
    REJECTED, // 반려
    BEFOR,    // 승인됨, 오픈 예정 (팀 스키마 원본 표기 그대로, 추후 BEFORE로 수정 권장)
    OPEN,     // 진행중
    CLOSED    // 종료
}