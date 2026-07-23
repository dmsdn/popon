import { apiFetch, clearToken } from "./client";

export type Provider = "kakao" | "google";

// OAuth는 fetch가 아니라 전체 페이지 이동이라 rewrites를 타지 않음 — 통합 백엔드(8080) 절대 주소로 이동.
// (카카오 콘솔에 등록된 Redirect URI도 8080 기준)
const OAUTH_BASE = "http://localhost:8080";

// 카카오 로그인 버튼 클릭 시 호출 — 백엔드가 카카오 인증 페이지로 리다이렉트해줍니다.
export function redirectToKakaoLogin() {
  window.location.href = `${OAUTH_BASE}/oauth2/authorization/kakao`;
}

export function redirectToGoogleLogin() {
  window.location.href = `${OAUTH_BASE}/oauth2/authorization/google`;
}

export interface SignupInfoPayload {
  nickname: string;
  phone: string;
  email?: string;
}

export function submitSignupInfo(payload: SignupInfoPayload) {
  return apiFetch<{ id: number; nickname: string; phone: string; onboarded: boolean }>(
    "/api/customer/me/signup-info",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export function submitPreferences(keywordIds: number[]) {
  return apiFetch<{ success: boolean }>("/api/customer/me/keywords", {
    method: "PUT",
    body: JSON.stringify(keywordIds),
  });
}

export function logout() {
  clearToken();
}

// -------------------- 개발용 로그인 (domain/consumer/auth/DevAuthController.java) --------------------
//
// 소셜 로그인 없이도 진짜 Customer row + 진짜 JWT를 발급받는 백엔드의 정식 개발용 엔드포인트예요.
// testId를 다르게 주면(예: "tester1", "tester2") 계정이 여러 개 생기고, 같은 testId면 같은 계정으로
// 다시 로그인돼요. testId/nickname 둘 다 안 주면 "default" 계정으로 로그인됩니다.
//
// ⚠️ 백엔드에서 이 엔드포인트가 동작하려면 두 가지가 맞춰져 있어야 해요 (프론트에서 확인 불가):
//   1. application.yml(또는 application-local.yml)에 `app.dev-login.enabled: true` 설정
//      — 없으면 백엔드가 "개발용 로그인은 app.dev-login.enabled=true 설정에서만..." 에러를 던져요.
//   2. SecurityConfig에 `/api/customer/dev-login`이 permitAll로 열려 있어야 해요
//      — 지금 확인해보니 이 경로가 안 열려 있어서, 로그인하려고 부르는 API 자체가
//        "로그인이 안 된 상태론 호출 불가"에 걸릴 수 있어요. 백엔드 팀 확인 필요.

export interface DevLoginPayload {
  testId?: string;
  nickname?: string;
}

export interface DevLoginResult {
  token: string;
  customerId: number;
  provider: string;
  nickname: string;
}

export function devLogin(payload: DevLoginPayload = {}) {
  return apiFetch<DevLoginResult>("/api/customer/dev-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
