package popupteam.popupbackend.domain.waiting;

public enum WaitingStatus {
    WAITING,     // 대기중
    CALLED,      // 호출됨 (15분 이내 입장 필요)
    ENTERED,     // 입장완료
    CANCELLED    // 취소 (15분 초과 자동취소, 또는 수동취소)
}