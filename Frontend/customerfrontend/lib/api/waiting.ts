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

// [신규 연결] 백엔드에 "로그인한 내 활성 웨이팅 전체 목록"을 돌려주는 API가 이미
// 있었어요(GET /api/waiting/me) - 예전엔 이게 없는 줄 알고 브라우저에 id를
// 하나씩 저장해두는 방식으로 우회하고 있었는데, 이제 진짜 API로 바로 받아와요.
// WAITING/CALLED 상태만 내려줘서(취소·입장완료 제외) "지금 활성 웨이팅이 있는지"
// 확인하는 용도로도 그대로 쓸 수 있어요.
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
// ⚠️ 백엔드 참고: 이 엔드포인트는 원래 "주최자/관리자 수동 취소"용으로 만들어져 있어서
// (PATCH /api/waiting/{id}/cancel), 소비자가 본인 웨이팅을 취소할 수 있는 전용 API가 아니에요.
// 현재는 로그인만 되어 있으면(스태프 여부/본인 소유 여부 확인 없이) 호출이 성공하길래
// 일단 이걸로 연결해뒀지만, 다른 사람의 웨이팅 id를 넣어도 취소가 되는 상태라 백엔드에서
// 소유권 확인(또는 소비자 전용 취소 API 분리)이 꼭 필요해요.
export function cancelWaiting(waitingId: number) {
  return apiFetch<Waiting>(`/api/waiting/${waitingId}/cancel`, {
    method: "PATCH",
  });
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
