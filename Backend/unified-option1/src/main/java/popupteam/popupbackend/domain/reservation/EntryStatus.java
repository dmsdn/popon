package popupteam.popupbackend.domain.reservation;

public enum EntryStatus {
    PENDING,     // 입장 전
    CHECKED_IN,  // 입장완료 (QR 스캔 또는 수동 처리)
    NO_SHOW      // 노쇼 처리
}