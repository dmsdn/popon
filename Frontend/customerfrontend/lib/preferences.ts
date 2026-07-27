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
