// 팝업 등록 임시저장 (7/30)
//
// 백엔드에는 "작성 중" 상태가 없다 — 팝업은 만들어지는 순간 PENDING으로 관리자 심사 대기열에
// 들어간다. 미완성 폼을 서버에 올릴 수는 없으므로 임시저장은 브라우저 localStorage에 두고,
// 「팝업 조회/수정」 표가 이 목록을 서버 팝업과 함께 읽어 「임시저장」 상태로 보여준다.
//
// 한계(화면에도 안내): 이미지 파일은 File 객체라 직렬화할 수 없어 저장되지 않고,
// 이 브라우저에서만 보인다(다른 PC·시크릿 창에서는 안 보임).

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
