// lib/api/visits.ts
// 앱 방문 기록을 백엔드에 저장하는 API

import { apiFetch } from "./client";

const VISITOR_KEY_STORAGE = "visitor_key";

function getOrCreateVisitorKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let key = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (!key) {
      key = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY_STORAGE, key);
    }
    return key;
  } catch {
    return "";
  }
}

export function logVisit() {
  const visitorKey = getOrCreateVisitorKey();
  if (!visitorKey) return Promise.resolve();
  return apiFetch<void>("/api/visits/log", {
    method: "POST",
    body: JSON.stringify({ visitorKey, appSource: "CUSTOMER" }),
  }).catch(() => {
    // 방문 로그는 실패해도 사용자 경험에 영향 없어야 해서 조용히 무시
  });
}
