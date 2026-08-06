// lib/utils/statusLabels.ts
// 예약·웨이팅·입장 상태의 백엔드 enum 값을 화면에서 사용할 한글 상태명으로 변환
// 등록되지 않은 상태값은 원래 값을 그대로 반환

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
