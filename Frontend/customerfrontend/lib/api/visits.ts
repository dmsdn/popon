// lib/api/visits.ts
//
// [신규 연결] POST /api/visits/log가 있어요 - 같은 visitorKey로 같은 날 다시 불러도
// 서버에서 중복 기록 안 하게 처리해줘서, 프론트는 그냥 앱 켜질 때마다 불러도 안전해요.

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
