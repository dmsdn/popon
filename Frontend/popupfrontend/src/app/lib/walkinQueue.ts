// 대기열 운영 보조 저장 모듈.
// 현장 웨이팅 등록·조회·입장·취소는 백엔드 실연동으로 이관됨(lib/api.ts의 waiting·queue API).
// 여기 남은 것은 서버 API가 없는 보조 기록뿐:
//  - 운영 모드(사전예약만/현장만/둘 다): 백엔드 Popup.queueMode가 생겼지만 등록/응답 DTO에 아직 미노출 → 로컬 유지
//  - 퇴장 처리: 퇴장 API 없음 → 로컬 기록
//  - 입장 완료된 웨이팅 목록: 통합 보드가 대기중만 반환 → 체류 표시용으로 입장 처리 시 로컬에 기록

export type OpsMode = "RESERVATION" | "WALKIN" | "BOTH";

// 로컬 시각 ISO (서버 LocalDateTime과 동일 포맷 — toISOString()은 UTC라 표시가 9시간 어긋남)
export function localNowIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function loadOpsMode(popupId: number | string): OpsMode {
  const v = localStorage.getItem(`waitingOpsMode:${popupId}`);
  return v === "RESERVATION" || v === "WALKIN" || v === "BOTH" ? v : "BOTH";
}

export function saveOpsMode(popupId: number | string, mode: OpsMode) {
  localStorage.setItem(`waitingOpsMode:${popupId}`, mode);
}

// ── 사전예약자 퇴장 기록 (백엔드에 퇴장 API 없음 — 체크인까지만 서버 기록) ──

const exitKey = (popupId: number | string) => `reservationExits:${popupId}`;

export function loadResExits(popupId: number | string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(exitKey(popupId)) ?? "{}");
  } catch {
    return {};
  }
}

export function markResExit(popupId: number | string, reservationId: number) {
  const map = loadResExits(popupId);
  map[String(reservationId)] = localNowIso();
  localStorage.setItem(exitKey(popupId), JSON.stringify(map));
}

// ── 입장 완료된 현장 웨이팅 기록 (체류 표시용 — 서버에 '입장 완료 목록' API가 없어 로컬 보관) ──

export type EnteredWaiting = {
  refId: number; // waiting_queue.id
  name: string;
  partySize: number;
  enteredAt: string;
  exitedAt?: string;
};

const enteredKey = (popupId: number | string) => `enteredWaitings:${popupId}`;

export function loadEnteredWaitings(popupId: number | string): EnteredWaiting[] {
  try {
    return JSON.parse(localStorage.getItem(enteredKey(popupId)) ?? "[]");
  } catch {
    return [];
  }
}

export function recordEnteredWaiting(popupId: number | string, rec: Omit<EnteredWaiting, "enteredAt"> & { enteredAt?: string }) {
  const list = loadEnteredWaitings(popupId).filter((x) => x.refId !== rec.refId);
  list.push({ ...rec, enteredAt: rec.enteredAt ?? localNowIso() });
  localStorage.setItem(enteredKey(popupId), JSON.stringify(list));
  return list;
}

export function markWaitingExit(popupId: number | string, refId: number) {
  const list = loadEnteredWaitings(popupId).map((x) =>
    x.refId === refId ? { ...x, exitedAt: localNowIso() } : x,
  );
  localStorage.setItem(enteredKey(popupId), JSON.stringify(list));
  return list;
}
