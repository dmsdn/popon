// lib/api/waiting.ts
import { apiFetch } from "./client";
import type { WaitingStatus } from "@/lib/constants/status";

export interface WaitingCreatePayload {
  name?: string;
  email?: string;
  phoneNumber: string;
  partySize: number;
}

export interface Waiting {
  id: number;
  popupId: number;
  customerId: number | null;
  name: string;
  email: string | null;
  phoneNumber: string;
  partySize: number;
  teamNumber: number;
  qrToken: string;
  status: WaitingStatus;
  teamsAhead: number;
  registeredAt: string;
  calledAt: string | null;
  callExpiresAt: string | null;
  enteredAt: string | null;
  source: "RESERVATION" | "ONSITE_WAITING";
}

export function registerWaiting(
  popupId: string | number,
  payload: WaitingCreatePayload,
  customerId?: number
) {
  const qs = customerId != null ? `?customerId=${customerId}` : "";
  return apiFetch<Waiting>(`/api/popups/${popupId}/waiting${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyWaitingStatus(waitingId: string | number) {
  return apiFetch<Waiting>(`/api/waiting/${waitingId}`);
}

export function cancelWaiting(waitingId: string | number) {
  return apiFetch<Waiting>(`/api/waiting/${waitingId}/cancel`, { method: "PATCH" });
}

// --- 로컬 저장: "내 웨이팅 목록" API가 없어서 등록 시 id를 임시로 기억해둠 ---
const ACTIVE_WAITING_KEY = "active_waiting_id";

export function setActiveWaitingId(id: number) {
  window.localStorage.setItem(ACTIVE_WAITING_KEY, String(id));
}

export function getActiveWaitingId(): number | null {
  const raw = window.localStorage.getItem(ACTIVE_WAITING_KEY);
  return raw ? Number(raw) : null;
}

export function clearActiveWaitingId() {
  window.localStorage.removeItem(ACTIVE_WAITING_KEY);
}