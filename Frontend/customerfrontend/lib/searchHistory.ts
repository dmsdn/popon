// lib/searchHistory.ts
// 최근 검색어를 저장하고 관리
// 내부 저장소 처리

const STORAGE_KEY = "recent_searches";
const MAX_COUNT = 10;

function readAll(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch (error) {
    console.error("최근 검색어를 불러오지 못했어요.", error);
    return [];
  }
}

function writeAll(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("최근 검색어를 저장하지 못했어요.", error);
  }
}

export function getRecentSearches(): string[] {
  return readAll();
}

// 검색을 실행할 때마다 호출
// 중복되면 맨 앞으로 올리고, 최대 10개까지만 유지
export function addRecentSearch(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return;

  const withoutDuplicate = readAll().filter((k) => k !== trimmed);
  const next = [trimmed, ...withoutDuplicate].slice(0, MAX_COUNT);
  writeAll(next);
}

// 특정 검색어 하나만 삭제 (바 오른쪽 끝의 X 버튼용)
export function removeRecentSearch(keyword: string) {
  writeAll(readAll().filter((k) => k !== keyword));
}

// 전체 비우기
export function clearRecentSearches() {
  writeAll([]);
}
