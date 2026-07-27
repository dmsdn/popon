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
  partySize?: number;
}

// ✅ 고객 본인이 호출 가능 (ReservationService.change에서 customerId 소유자 검증)
export function changeReservation(reservationId: number, customerId: number, payload: ReservationChangePayload) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/change?customerId=${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ⚠️ 백엔드 ReservationService.cancel()이 "사업자(business) 계정"인지만 확인하고 있어서,
// 고객이 자기 예약을 취소하는 용도로는 아직 못 써요 (호출하면 "존재하지 않는 사업자입니다"
// 에러가 나요). 고객이 취소할 수 있게 하려면 백엔드에서 예약 소유자(customerId) 검증
// 분기를 추가해줘야 해요 - 지금은 그대로 연결만 해두고, 실패 메시지로 안내합니다.
export function cancelReservation(reservationId: number, cancelReason?: string) {
  return apiFetch<Reservation>(`/api/reservations/${reservationId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ cancelReason }),
  });
}
