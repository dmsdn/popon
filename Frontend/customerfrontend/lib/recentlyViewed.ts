// lib/recentlyViewed.ts
// 최근 본 팝업을 브라우저에 저장하고 조회
// 최근 본 popupId를 최신순으로 최대 20개까지 저장
// 내부 저장소 처리

const STORAGE_KEY = "recently_viewed_popup_ids";
const MAX_ITEMS = 20;

export function recordPopupView(popupId: number) {
  if (typeof window === "undefined") return;
  try {
    const ids = getRecentlyViewedIds().filter((id) => id !== popupId);
    ids.unshift(popupId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
  } catch (error) {
    console.error("최근 본 팝업 기록 실패", error);
  }
}

export function getRecentlyViewedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}
