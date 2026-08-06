// lib/postLoginRedirect.ts
// 로그인 후 원래 페이지로 돌아가기 위한 경로 저장/조회

const KEY = "post_login_redirect";

export function saveRedirectTarget(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, path);
  } catch {
    // 저장 실패해도 로그인 자체는 진행돼야 해서 조용히 무시
  }
}

export function consumeRedirectTarget(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(KEY);
    if (value) window.sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
