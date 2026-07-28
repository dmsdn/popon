// lib/preferences.ts
// [수정] 관심 지역/카테고리는 이제 실제 백엔드 API로 관리해요
// (lib/api/regions.ts, lib/api/customer.ts의 getKeywords/getMyInterests 참고).
// 여기 있던 로컬 저장 전용 REGIONS/CATEGORIES, getPreferredRegions 등은 더 이상
// 어디서도 쓰지 않아서(=실제 저장값과 어긋나기만 하던 죽은 코드) 제거했어요.

// 알림 설정 - 마찬가지로 백엔드에 저장 API가 없어서 브라우저에만 저장해요.
// (기존엔 이것도 순수 React state라 새로고침하면 항상 기본값으로 리셋됐어요)
const NOTIF_STORAGE_KEY = "notification_settings";

export function getNotifSettings<T>(fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setNotifSettingsStorage(value: unknown) {
  try {
    window.localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("알림 설정 저장 실패", error);
  }
}
