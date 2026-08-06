// [7/30] 팝업등록 임시저장 — 백엔드에 "작성중" 상태 없어(생성즉시 PENDING 심사대기) localStorage 보관
// "팝업 조회/수정" 표가 서버 팝업과 함께 이 목록을 읽어 "임시저장" 상태로 표시
// 한계: 이미지(File객체)는 직렬화 불가라 저장 안 됨, 이 브라우저에서만 보임(다른PC·시크릿창 불가)

import type { SnsLinkInput } from "./api";
import type { OpsMode } from "./walkinQueue";

export type DraftDayHours = { open: string; close: string; closed: boolean };

export type PopupDraft = {
  id: string;        // Date.now() 문자열 — 목록 키·재열기 파라미터(?draft=)로 사용
  savedAt: string;   // ISO — 표의 "저장 시각" 표시용
  title: string;
  description: string;
  notice: string;
  startDate: string;
  endDate: string;
  openTime: string;
  closeTime: string;
  sameHours: boolean;
  dayHours: DraftDayHours[];
  directAddress: string;
  zonecode: string;
  tags: string[];
  cats: number[];
  regionId: number | "";
  snsLinks: SnsLinkInput[];
  opsMode: OpsMode;
  maxCapacity: number;
  slotUnit: number;
  slotCapacity: number;
  maxPartyPerTeam: number | "";
};

const DRAFTS_KEY = "sellerPopupDrafts";

export function loadDrafts(): PopupDraft[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findDraft(id: string): PopupDraft | undefined {
  return loadDrafts().find((d) => d.id === id);
}

// 같은 id면 덮어쓰기 — 이어서 작성하다 다시 임시저장해도 목록에 한 줄만 남는다
export function upsertDraft(draft: PopupDraft) {
  const rest = loadDrafts().filter((d) => d.id !== draft.id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify([draft, ...rest]));
}

export function removeDraft(id: string) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(loadDrafts().filter((d) => d.id !== id)));
}
