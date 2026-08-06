// lib/api/waiting.ts
// 웨이팅 API
import { apiFetch } from "./client";

export interface WaitingCreatePayload {
  name?: string; // 비회원용
  email?: string; // 비회원용
  phoneNumber: string;
  partySize: number;
}

export interface Waiting {
  id: number;
  popupId: number;
  customerId: number | null;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  partySize: number;
  teamNumber: number;
  qrToken: string;
  status: string;
  teamsAhead: number;
  registeredAt: string;
  calledAt: string | null;
  callExpiresAt: string | null;
  enteredAt: string | null;
  source: string;
}

export interface WaitingBoard {
  popupId: number;
  totalWaitingTeams: number;
  waitingList: Waiting[];
}

// 현재 대기 현황(전체 대기팀 수) - 로그인 여부 상관없이 조회 가능
export function getWaitingBoard(popupId: number) {
  return apiFetch<WaitingBoard>(`/api/popups/${popupId}/waiting/board`);
}

// 회원 웨이팅 등록 (로그인 상태 - customerId 전달)
export function registerWaiting(popupId: number, customerId: number, payload: WaitingCreatePayload) {
  return apiFetch<Waiting>(`/api/popups/${popupId}/waiting?customerId=${customerId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyWaitingStatus(waitingId: number) {
  return apiFetch<Waiting>(`/api/waiting/${waitingId}`);
}

// QR 토큰만으로 웨이팅 상태를 조회
export interface WaitingQrStatus {
  // NO_SHOW: 8/4 신설 — 직원 노쇼 처리 또는 자정 리셋으로 미입장 확정된 대기
  status: "WAITING" | "CALLED" | "ENTERED" | "CANCELLED" | "NO_SHOW";
  popupTitle?: string;
  teamNumber?: number;
  teamsAhead?: number;
}

export function getWaitingStatusByQr(token: string) {
  return apiFetch<WaitingQrStatus>(`/api/waiting/qr/${token}`);
}

// 로그인한 내 활성 웨이팅 전체 목록 조회 (취소·입장완료 제외)
export interface MyActiveWaiting {
  waitingId: number;
  popupId: number;
  popupTitle: string;
  teamNumber: number;
  teamsAhead: number;
  status: string;
  registeredAt: string;
}

export function getMyActiveWaitings(customerId: number) {
  return apiFetch<MyActiveWaiting[]>(`/api/waiting/me?customerId=${customerId}`);
}

// 웨이팅 취소
export function cancelWaiting(waitingId: number, customerId: number) {
  return apiFetch<Waiting>(`/api/waiting/${waitingId}/cancel?customerId=${customerId}`, {
    method: "PATCH",
  });
}

// -------------------- 내 웨이팅 id 로컬 기록 --------------------
const MY_WAITING_IDS_KEY = "my_waiting_ids";

export function addMyWaitingId(id: number) {
  try {
    const ids = getMyWaitingIds();
    if (!ids.includes(id)) {
      window.localStorage.setItem(MY_WAITING_IDS_KEY, JSON.stringify([...ids, id]));
    }
  } catch (error) {
    console.error("웨이팅 id 로컬 저장 실패", error);
  }
}

export function getMyWaitingIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MY_WAITING_IDS_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function removeMyWaitingId(id: number) {
  try {
    window.localStorage.setItem(MY_WAITING_IDS_KEY, JSON.stringify(getMyWaitingIds().filter((i) => i !== id)));
  } catch (error) {
    console.error("웨이팅 id 로컬 삭제 실패", error);
  }
}
