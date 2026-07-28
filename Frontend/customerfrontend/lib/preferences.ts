// lib/preferences.ts
// 관심 지역/카테고리 - 백엔드에 저장할 API가 아직 없어서 브라우저에만 저장해요.
// (app/signup/preferences/page.tsx에서 처음 만든 것과 같은 키를 씁니다)

export const REGIONS = ["성수", "홍대", "여의도", "용산", "더현대서울"];
export const CATEGORIES = ["뷰티", "패션", "애니", "푸드", "스포츠", "라이프", "굿즈", "문구"];

const REGION_STORAGE_KEY = "preferred_regions";
const CATEGORY_STORAGE_KEY = "preferred_categories";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getPreferredRegions(): string[] {
  return readList(REGION_STORAGE_KEY);
}

export function getPreferredCategories(): string[] {
  return readList(CATEGORY_STORAGE_KEY);
}

export function setPreferredRegions(regions: string[]) {
  try {
    window.localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(regions));
  } catch (error) {
    console.error("관심 지역 저장 실패", error);
  }
}

export function setPreferredCategories(categories: string[]) {
  try {
    window.localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("관심 카테고리 저장 실패", error);
  }
}

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
