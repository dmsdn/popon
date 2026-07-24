// lib/recentlyViewed.ts
//
// "최근 본 팝업" 기록. 백엔드에 로그인 사용자별 조회 이력 API가 없어서
// (backend-todo.md 2번 참고), 이 브라우저의 localStorage에 최근 본 popupId를
// 최신순으로 최대 20개까지 저장해요. 다른 기기/브라우저에서는 안 보여요.

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
