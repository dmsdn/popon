// lib/api/reservations.ts
import { apiFetch } from "./client";

export interface ReservationCreatePayload {
  popupId: number;
  slotId?: number; // SLOT 모드 팝업이면 필수
  reservationDate?: string; // "YYYY-MM-DD", FREE 모드 팝업이면 필수
  partySize: number;
}

export interface Reservation {
  id: number;
  popupId: number;
  slotId: number | null;
  reservationDate: string | null;
  customerId: number;
  partySize: number;
  status: string;
  createdAt: string;
  entryStatus: string;
  qrToken: string;
}

// ⚠️ 백엔드가 customerId를 JWT가 아니라 쿼리파라미터로 받아요 (ReservationController 기준).
export function createReservation(customerId: number, payload: ReservationCreatePayload) {
  return apiFetch<Reservation>(`/api/reservations?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyReservations(customerId: number) {
  return apiFetch<Reservation[]>(`/api/reservations/me?customerId=${customerId}`);
}
