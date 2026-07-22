// lib/constants/status.ts
// 백엔드(popupteam.popupbackend.domain.*)에 등록된 enum 값을 그대로 반영합니다.
// 백엔드 값이 추가/변경되면 이 파일만 고치면 됩니다.

/** popup.PopupStatus */
export const POPUP_STATUS = {
  PENDING: "PENDING",   // 심사 대기 (등록 직후 기본값)
  REJECTED: "REJECTED", // 반려
  BEFOR: "BEFOR",        // 승인됨, 오픈 예정 (백엔드 원본 표기 그대로. 오타 아님)
  OPEN: "OPEN",          // 진행중
  CLOSED: "CLOSED",      // 종료
} as const;
export type PopupStatus = (typeof POPUP_STATUS)[keyof typeof POPUP_STATUS];

export const POPUP_STATUS_LABEL: Record<PopupStatus, string> = {
  PENDING: "심사중",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
};

/** reservation.ReservationStatus */
export const RESERVATION_STATUS = {
  CONFIRMED: "CONFIRMED", // 예약 확정 (결제 제외, 예약 즉시 이 상태)
  CANCELLED: "CANCELLED", // 주최자가 취소 처리
} as const;
export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: "예약 확정",
  CANCELLED: "예약 취소",
};

/** reservation.EntryStatus (입장 처리) */
export const ENTRY_STATUS = {
  PENDING: "PENDING",       // 입장 전
  CHECKED_IN: "CHECKED_IN", // 입장완료 (QR 스캔 또는 수동 처리)
  NO_SHOW: "NO_SHOW",       // 노쇼 처리
} as const;
export type EntryStatus = (typeof ENTRY_STATUS)[keyof typeof ENTRY_STATUS];

export const ENTRY_STATUS_LABEL: Record<EntryStatus, string> = {
  PENDING: "입장 전",
  CHECKED_IN: "입장완료",
  NO_SHOW: "노쇼",
};

/** waiting.WaitingStatus */
export const WAITING_STATUS = {
  WAITING: "WAITING",     // 대기중
  CALLED: "CALLED",       // 호출됨 (15분 이내 입장 필요)
  ENTERED: "ENTERED",     // 입장완료
  CANCELLED: "CANCELLED", // 취소 (15분 초과 자동취소, 또는 수동취소)
} as const;
export type WaitingStatus = (typeof WAITING_STATUS)[keyof typeof WAITING_STATUS];

export const WAITING_STATUS_LABEL: Record<WaitingStatus, string> = {
  WAITING: "대기중",
  CALLED: "호출됨",
  ENTERED: "입장완료",
  CANCELLED: "취소됨",
};

/** popup.ReservationMode (팝업 단위로 정해지는 예약 방식) */
export const RESERVATION_MODE = {
  SLOT: "SLOT", // 시간대 선택 예약
  FREE: "FREE", // 당일 아무때나 방문 (시간 미지정)
} as const;
export type ReservationMode = (typeof RESERVATION_MODE)[keyof typeof RESERVATION_MODE];

export const RESERVATION_MODE_LABEL: Record<ReservationMode, string> = {
  SLOT: "시간대 예약",
  FREE: "자유 방문",
};

/** popup.QueueMode (팝업 단위로 정해지는 사전예약/현장웨이팅 지원 여부) */
export const QUEUE_MODE = {
  PRERESERVATION_ONLY: "PRERESERVATION_ONLY", // 사전예약만
  ONSITE_WAITING_ONLY: "ONSITE_WAITING_ONLY", // 현장웨이팅만
  BOTH: "BOTH",                                 // 둘 다
} as const;
export type QueueMode = (typeof QUEUE_MODE)[keyof typeof QUEUE_MODE];

export const QUEUE_MODE_LABEL: Record<QueueMode, string> = {
  PRERESERVATION_ONLY: "사전예약만 가능",
  ONSITE_WAITING_ONLY: "현장웨이팅만 가능",
  BOTH: "사전예약·현장웨이팅 모두 가능",
};