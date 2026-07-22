import { apiFetch, clearToken } from "./client"

export type Provider = "kakao" | "google";

// OAuth 리다이렉트는 전체 페이지 이동이라 CORS와 무관합니다.
// 카카오/구글 콘솔에 등록된 redirect URI가 8081 기준이므로 절대 주소를 그대로 씁니다.
const OAUTH_BASE = "http://localhost:8081";

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