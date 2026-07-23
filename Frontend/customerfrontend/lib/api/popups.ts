// lib/api/popups.ts
import { apiFetch } from "./client";
import type { PopupStatus, ReservationMode } from "@/lib/constants/status";

export interface PopupDetail {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  status: PopupStatus;
  rejectReason: string | null;
  createdAt: string;
  areaSqm: number | null;
  recommendedCapacity: number | null;
  capacity: number;
  reservationMode: ReservationMode; // SLOT | FREE
  // ⚠️ 백엔드 PopupResponse에 queueMode가 아직 없어서, 사전예약/현장웨이팅
  //    가능 여부는 지금 이 응답만으로는 구분할 수 없어요. (백엔드에 추가 요청 필요)
  avgExperienceMinutes: number;
  latitude: number | null;
  longitude: number | null;
}

export function getPopup(popupId: string | number) {
  return apiFetch<PopupDetail>(`/api/popups/${popupId}`);
}

export function searchPopups(params?: { location?: string; status?: string; keyword?: string }) {
  const query = new URLSearchParams();
  if (params?.location) query.set("location", params.location);
  if (params?.status) query.set("status", params.status);
  if (params?.keyword) query.set("keyword", params.keyword);
  const qs = query.toString();
  return apiFetch<PopupDetail[]>(`/api/popups${qs ? `?${qs}` : ""}`);
}

export interface PopupSlot {
  id: number;
  popupId: number;
  slotDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  endTime: string;
  capacity: number;
  reservedCount: number;
  remaining: number;
}

/** SLOT 모드 팝업일 때만 의미 있음 (FREE 모드면 빈 배열) */
export function getPopupSlots(popupId: string | number) {
  return apiFetch<PopupSlot[]>(`/api/popups/${popupId}/slots`);
}