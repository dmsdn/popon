// 좌측 사이드바 '새 소식' 뱃지 — 라우트별로 확인한 항목 키를 localStorage에 기억.
// 키는 "종류:id" 또는 "종류:id:상태" 형태 — 상태가 바뀌면 다른 키가 되어 다시 새 소식으로 집계된다.
// 해당 라우트에 방문하면 현재 키 전체를 '확인함'으로 저장 → 뱃지 즉시 해제.

const PREFIX = "navSeen:";

export function loadSeen(route: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + route) ?? "[]");
  } catch {
    return [];
  }
}

export function saveSeen(route: string, keys: string[]) {
  localStorage.setItem(PREFIX + route, JSON.stringify(keys));
}

export function unseenCount(keys: string[], seen: string[]): number {
  return keys.filter((k) => !seen.includes(k)).length;
}
