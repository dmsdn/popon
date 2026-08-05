package popupteam.popupbackend.domain.waiting;

public enum WaitingStatus {
    WAITING,     // 대기중
    CALLED,      // 호출됨 (15분 이내 입장 필요)
    ENTERED,     // 입장완료
    CANCELLED,   // 취소 (손님 본인 취소 또는 직원 수동취소)
    NO_SHOW      // 미입장 (직원 노쇼 버튼 또는 자정 리셋) — 예약의 EntryStatus.NO_SHOW와 같은 사건 (8/4 추가)
}