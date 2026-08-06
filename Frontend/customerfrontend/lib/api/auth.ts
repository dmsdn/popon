// lib/api/auth.ts
// 로그인
import { apiFetch, clearToken } from "./client";

export type Provider = "kakao" | "google";

// OAuth 로그인 주소를 프론트의 프록시(rewrites)를 거치지 않고 통합 백엔드의 실제 주소로 직접 연결
// 백엔드 주소의 origin은 카카오·구글 콘솔에 등록된 Redirect URI와 일치해야 하며, 구글은 IP 주소를 Redirect URI로 사용할 수 없어 배포 환경에서는 nip.io 기반 공개 도메인을 사용
// 브라우저에서 사용할 수 있도록 NEXT_PUBLIC_ 환경변수로 관리
// 서버 전용 BACKEND_ORIGIN과는 별도로 구분
const OAUTH_BASE = process.env.NEXT_PUBLIC_OAUTH_BASE ?? "http://localhost:8080";

// 카카오 로그인 버튼 클릭 시 호출 — 백엔드가 카카오 인증 페이지로 리다이렉트
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
  termsAgreed: boolean;
  privacyAgreed: boolean;
  locationAgreed: boolean;
  marketingAgreed: boolean;
}

// [수정] 회원가입 정보 저장 API를 PATCH /api/customer/me에서 POST /api/customer/signup-info로 변경
// 회원정보 입력 화면이 반복되는 문제를 해결 (기존 API는 닉네임·프로필·생년월일·성별만 처리)
export function submitSignupInfo(payload: SignupInfoPayload) {
  // [수정] 가입대기 상태에서 회원정보를 제출하면 백엔드가 Customer를 생성하고 실제 로그인에 사용할 새 토큰을 반환
  // 기존의 응답의 token 필드를 처리하지 않아 버려지는 문제 해결
  return apiFetch<{ success: boolean; customerId: number; token?: string }>("/api/customer/signup-info", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// [수정] 관심 키워드 저장 API를 실제 백엔드의 POST /api/customer/interests로 변경
// 백엔드가 요구하는 형식에 맞춰 요청 데이터를 배열에서 { keywordIds: [...] } 객체 형태로 수정
export function submitPreferences(keywordIds: number[]) {
  return apiFetch<{ success: boolean; count: number }>("/api/customer/interests", {
    method: "POST",
    body: JSON.stringify({ keywordIds }),
  });
}

// [신규 연결] 로그인 후 회원정보 입력 여부를 백엔드의 실제 가입 상태로 판단하도록 수정
// 기존의 OAuth 로그인에서 존재하지 않는 onboarded 파라미터를 사용하거나 개발 로그인에서 무조건 홈으로 이동해 
// 기존 회원이 반복해서 회원정보 입력 화면으로 이동하거나 신규 회원이 입력 화면을 건너뛰는 문제 해결
// GET /api/customer/signup-info/status API를 연결
// 일반 로그인과 개발 로그인 모두 실제 signupCompleted 상태에 따라 회원정보 입력 화면 또는 홈으로 이동하도록 수정
export function getSignupStatus() {
  return apiFetch<{ signupCompleted: boolean }>("/api/customer/signup-info/status");
}

export function logout() {
  clearToken();
}

// -------------------- 개발용 로그인 (domain/consumer/auth/DevAuthController.java) --------------------
//
// 개발용 로그인 API를 소셜 로그인 없이 실제 Customer 계정과 JWT를 발급받을 수 있는 정식 개발용 엔드포인트로 연결

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