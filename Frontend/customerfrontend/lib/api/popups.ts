// lib/api/popups.ts
import { apiFetch } from "./client";

// 백엔드 PopupResponse와 동일한 필드 (domain/popup/dto/PopupResponse.java 기준)
export interface PopupDetail {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  status: "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED";
  rejectReason: string | null;
  createdAt: string;
  areaSqm: number | null;
  recommendedCapacity: number | null;
  capacity: number;
  reservationMode: "SLOT" | "FREE";
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
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  remaining: number;
}

export function getPopupSlots(popupId: string | number) {
  return apiFetch<PopupSlot[]>(`/api/popups/${popupId}/slots`);
}
