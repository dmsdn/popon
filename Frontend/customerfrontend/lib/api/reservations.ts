// lib/api/reservations.ts
import { apiFetch } from "./client";
import type { ReservationStatus, EntryStatus } from "@/lib/constants/status";

export interface ReservationCreatePayload {
  popupId: number;
  slotId?: number;          // SLOT 모드 팝업이면 필수
  reservationDate?: string; // FREE 모드 팝업이면 필수, "YYYY-MM-DD"
  partySize: number;
}

export interface Reservation {
  id: number;
  popupId: number;
  slotId: number | null; // FREE 모드면 null
  reservationDate: string | null;
  customerId: number;
  partySize: number;
  status: ReservationStatus;
  createdAt: string;
  entryStatus: EntryStatus;
  qrToken: string; // QR 입장권 렌더링용
}

/** 예약 생성. SLOT 모드 팝업이면 slotId, FREE 모드면 reservationDate를 채워서 호출 */
export function createReservation(customerId: number, payload: ReservationCreatePayload) {
  return apiFetch<Reservation>(`/api/reservations?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** 내 예약 전체 목록 (예약 상세 페이지는 이 목록에서 id로 찾아 씀 — 단건 조회 API가 없음) */
export function getMyReservations(customerId: number) {
  return apiFetch<Reservation[]>(`/api/reservations/me?customerId=${customerId}`);
}

export function cancelReservation(reservationId: number, cancelReason?: string) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/cancel`, {
    method: "PATCH",
    body: cancelReason ? JSON.stringify({ cancelReason }) : undefined,
  });
}