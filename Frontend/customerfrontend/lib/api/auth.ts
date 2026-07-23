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
  window.location.href = `${OAUTH_BASE}/oauth2/authorization/kakao`;
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