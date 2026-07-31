// lib/api/visits.ts
//
// [신규 연결] POST /api/visits/log가 있어요 - 같은 visitorKey로 같은 날 다시 불러도
// 서버에서 중복 기록 안 하게 처리해줘서, 프론트는 그냥 앱 켜질 때마다 불러도 안전해요.

import { apiFetch } from "./client";

const VISITOR_KEY_STORAGE = "visitor_key";

// crypto.randomUUID()는 **보안 컨텍스트(HTTPS 또는 localhost)에서만 존재한다** (7/31).
// 평문 HTTP로 배포하면 undefined가 되어 TypeError가 난다. 아래 try/catch가 그걸 삼키는 바람에
// 이 앱은 화면이 죽지는 않았지만, 방문자 키가 빈 문자열이 되어 **집계가 조용히 멈춘다.**
// (주최자·관리자 앱은 같은 호출이 catch 밖에 있어서 첫 렌더가 통째로 죽었다)
// 이 값은 방문자 구분용일 뿐 보안에 쓰이지 않으므로 없으면 난수로 대체한다.
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateVisitorKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let key = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (!key) {
      key = randomId();
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
