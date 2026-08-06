// lib/api/reservations.ts
// 사용자의 예약 정보를 관리하는 API
import { apiFetch } from "./client";

// 예약 생성에 필요한 정보
export interface ReservationCreatePayload {
  popupId: number;
  slotId?: number; // SLOT 모드 팝업이면 필수
  reservationDate?: string; // "YYYY-MM-DD", FREE 모드 팝업이면 필수
  reservationTime?: string; // "HH:mm:ss" 또는 "HH:mm", FREE 모드에서 시간 선택 시
  partySize: number;
}

// 예약 정보
export interface Reservation {
  id: number;
  popupId: number;
  slotId: number | null;
  reservationDate: string | null;
  reservationTime: string | null;
  customerId: number;
  partySize: number;
  status: string;
  createdAt: string;
  entryStatus: string;
  qrToken: string;
}

// 예약 생성
export function createReservation(customerId: number, payload: ReservationCreatePayload) {
  return apiFetch<Reservation>(`/api/reservations?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 내 예약 목록 조회
export function getMyReservations(customerId: number) {
  return apiFetch<Reservation[]>(`/api/reservations/me?customerId=${customerId}`);
}

// 예약 상세 조회
export async function getMyReservationById(customerId: number, reservationId: number) {
  const list = await getMyReservations(customerId);
  const found = list.find((r) => r.id === reservationId);
  if (!found) throw new Error("예약 정보를 찾을 수 없어요.");
  return found;
}

// 예약 변경에 필요한 정보
export interface ReservationChangePayload {
  newSlotId?: number; // SLOT 모드면 필수
  newReservationDate?: string; // "YYYY-MM-DD", FREE 모드면
  newReservationTime?: string; // "HH:mm:ss" 또는 "HH:mm"
  partySize?: number;
}

// 예약 변경
export function changeReservation(reservationId: number, customerId: number, payload: ReservationChangePayload) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/change?customerId=${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// 예약 취소
export function cancelReservation(reservationId: number, customerId: number, cancelReason?: string) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/cancel?customerId=${customerId}`, {
    method: "PATCH",
    body: JSON.stringify({ cancelReason }),
  });
}
