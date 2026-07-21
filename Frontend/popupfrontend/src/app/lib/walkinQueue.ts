// 현장 웨이팅(워크인) 대기열 + 운영 모드 + 퇴장 기록 저장 모듈.
// ⚠ 현장 웨이팅 관련 백엔드 API가 아직 없어 localStorage 기반(같은 브라우저 데모 한정).
//    백엔드 구현 시 이 모듈의 함수 내부만 API 호출로 교체하면 화면 코드는 그대로 동작한다.
//    - 대기 등록:      POST /api/popups/{popupId}/waitings        (회원/비회원)
//    - 대기열 조회:    GET  /api/popups/{popupId}/waitings
//    - 입장/노쇼/퇴장: PATCH /api/waitings/{id}/checkin | no-show | exit
//    - 입장 QR 발송:   비회원 폼 제출 시 전화번호·이메일로 발송 (메일·SMS 인프라 필요)

export type WalkinType = "MEMBER" | "GUEST"; // MEMBER=플랫폼 회원(소셜로그인) 웨이팅, GUEST=비회원 폼 접수

export type WalkinEntry = {
  id: string; // 로컬 uuid (백엔드 연동 시 서버 id)
  popupId: number;
  slotId: number | null; // 접수 시각이 속한 슬롯 (없으면 null = 슬롯 미지정)
  type: WalkinType;
  name: string;
  phone?: string;
  email?: string;
  partySize: number;
  createdAt: string; // ISO
  enteredAt?: string; // 입장 처리 시각
  noShowAt?: string; // 노쇼 처리 시각
  exitedAt?: string; // 퇴장 처리 시각
};

// 로컬 시각 ISO (서버 LocalDateTime과 동일 포맷 — toISOString()은 UTC라 표시가 9시간 어긋남)
export function localNowIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const queueKey = (popupId: number | string) => `walkinQueue:${popupId}`;

export function loadWalkins(popupId: number | string): WalkinEntry[] {
  try {
    return JSON.parse(localStorage.getItem(queueKey(popupId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveWalkins(popupId: number | string, list: WalkinEntry[]) {
  localStorage.setItem(queueKey(popupId), JSON.stringify(list));
}

export function addWalkin(
  popupId: number,
  data: Omit<WalkinEntry, "id" | "popupId" | "createdAt">,
): WalkinEntry {
  const entry: WalkinEntry = {
    ...data,
    id: crypto.randomUUID(),
    popupId,
    createdAt: localNowIso(),
  };
  saveWalkins(popupId, [...loadWalkins(popupId), entry]);
  return entry;
}

export function updateWalkin(
  popupId: number | string,
  id: string,
  patch: Partial<WalkinEntry>,
): WalkinEntry[] {
  const next = loadWalkins(popupId).map((w) => (w.id === id ? { ...w, ...patch } : w));
  saveWalkins(popupId, next);
  return next;
}

// ── 운영 모드: 사전예약만 / 현장 웨이팅만 / 둘 다 ──
// 두 방식 동시 운영 시 현장 대기열 조정 의무는 주최자에게 있음(플랫폼은 통합관리 도구만 제공)

export type OpsMode = "RESERVATION" | "WALKIN" | "BOTH";

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
