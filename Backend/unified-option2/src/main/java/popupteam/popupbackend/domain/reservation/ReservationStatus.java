package popupteam.popupbackend.domain.reservation;

public enum ReservationStatus {
    CONFIRMED,  // 예약 확정 (결제 제외, 예약 즉시 이 상태)
    CANCELLED   // 주최자가 취소 처리
}