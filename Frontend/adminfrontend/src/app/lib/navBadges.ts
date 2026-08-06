

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
