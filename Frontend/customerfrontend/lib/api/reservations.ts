// lib/api/reservations.ts
import { apiFetch } from "./client";

export interface ReservationCreatePayload {
  popupId: number;
  slotId?: number; // SLOT 모드 팝업이면 필수
  reservationDate?: string; // "YYYY-MM-DD", FREE 모드 팝업이면 필수
  reservationTime?: string; // "HH:mm:ss" 또는 "HH:mm", FREE 모드에서 시간 선택 시
  partySize: number;
}

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

// 백엔드에 "id로 단건 조회" API가 없어서, 내 예약 목록에서 찾아요.
export async function getMyReservationById(customerId: number, reservationId: number) {
  const list = await getMyReservations(customerId);
  const found = list.find((r) => r.id === reservationId);
  if (!found) throw new Error("예약 정보를 찾을 수 없어요.");
  return found;
}

export interface ReservationChangePayload {
  newSlotId?: number; // SLOT 모드면 필수
  newReservationDate?: string; // "YYYY-MM-DD", FREE 모드면
  newReservationTime?: string; // "HH:mm:ss" 또는 "HH:mm"
  partySize?: number;
}

// ✅ 고객 본인이 호출 가능 (ReservationService.change에서 customerId 소유자 검증)
export function changeReservation(reservationId: number, customerId: number, payload: ReservationChangePayload) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/change?customerId=${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// [수정] 백엔드에 고객 본인 취소 전용 메서드(cancelByCustomer)가 추가됐어요.
// 다만 customerId를 쿼리파라미터로 넘겨야 그 경로를 타고, 안 넘기면 여전히
// 예전처럼 "사업자(business) 계정"인지 확인하는 경로로 빠져서 실패해요.
export function cancelReservation(reservationId: number, customerId: number, cancelReason?: string) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/cancel?customerId=${customerId}`, {
    method: "PATCH",
    body: JSON.stringify({ cancelReason }),
  });
}
