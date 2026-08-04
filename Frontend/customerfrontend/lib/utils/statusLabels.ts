// lib/utils/statusLabels.ts
//
// [수정] 예약/웨이팅 목록에 백엔드 상태 enum("CONFIRMED", "CANCELLED", "WAITING" 등)이
// 번역 없이 그대로 노출되고 있었어요. 한글 라벨로 바꿔서 보여줍니다.

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "예약 확정",
  CANCELLED: "취소됨",
};

export const WAITING_STATUS_LABEL: Record<string, string> = {
  WAITING: "대기중",
  CALLED: "호출됨",
  ENTERED: "입장완료",
  CANCELLED: "취소됨",
  NO_SHOW: "미입장", // 8/4 — 직원 노쇼 처리·자정 리셋. 예약의 entry_status NO_SHOW와 같은 사건
};

export const ENTRY_STATUS_LABEL: Record<string, string> = {
  PENDING: "입장 전",
  CHECKED_IN: "입장완료",
  NO_SHOW: "노쇼 처리",
};

export function reservationStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABEL[status] ?? status;
}
export function waitingStatusLabel(status: string): string {
  return WAITING_STATUS_LABEL[status] ?? status;
}
export function entryStatusLabel(status: string): string {
  return ENTRY_STATUS_LABEL[status] ?? status;
}
