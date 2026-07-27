// lib/api/waiting.ts
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

// -------------------- 내 웨이팅 id 로컬 기록 --------------------
// ⚠️ 백엔드에 "로그인한 내 웨이팅 전체 목록"을 돌려주는 API가 없어서
// (GET /api/waiting/{id} 하나씩만 조회 가능), 웨이팅 등록에 성공할 때마다
// 그 id를 브라우저에 기록해두고, 마이페이지에서 그 id들로 하나씩 상태를 조회해요.
// 이 브라우저에서 등록한 것만 보여요 — 다른 기기에서 등록한 웨이팅은 안 보일 수 있어요.
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
