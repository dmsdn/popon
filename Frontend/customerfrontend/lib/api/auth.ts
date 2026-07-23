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

// -------------------- 이메일/비밀번호 회원가입·로그인 (개발용 다중 계정 테스트) --------------------
//
// ⚠️ 백엔드에 아직 이 엔드포인트가 없어요 (SecurityConfig에 /api/auth/**는 열려있지만
//    실제로 처리하는 컨트롤러가 없는 상태 — 백엔드 팀 확인 필요).
// 그래서 실 API를 먼저 시도하고, 실패하면 개발 모드에서만 브라우저 localStorage에
// "여러 개의" 테스트 계정을 저장/조회하는 방식으로 대체해요. (AuthContext.tsx의
// mock_accounts 저장소를 그대로 씁니다 — 계정을 여러 개 만들어서 이메일만 바꿔 로그인하면 됩니다.)
//
// 백엔드에 실제로 이 엔드포인트가 생기면 이 파일은 안 건드려도 자동으로 실 API를 타요.

import type { CustomerInfo } from "./customer";

const MOCK_ACCOUNT_TOKEN_PREFIX = "MOCK_ACCOUNT:";
const MOCK_ACCOUNTS_KEY = "mock_accounts";

export interface EmailLoginPayload {
  email: string;
  password: string;
}

export interface EmailSignupPayload extends EmailLoginPayload {
  nickname: string;
}

export interface EmailAuthResult {
  token: string;
  onboarded: boolean;
}

type MockAccount = CustomerInfo & { password: string };

function readMockAccounts(): Record<string, MockAccount> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MOCK_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMockAccounts(accounts: Record<string, MockAccount>) {
  try {
    window.localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error("테스트 계정 저장 실패", error);
  }
}

function mockSignup(payload: EmailSignupPayload): EmailAuthResult {
  const accounts = readMockAccounts();
  if (accounts[payload.email]) {
    throw new Error("이미 가입된 이메일이에요. 로그인해주세요.");
  }

  const account: MockAccount = {
    id: Date.now(),
    provider: "EMAIL",
    nickname: payload.nickname,
    profileImage: null,
    phone: null,
    email: payload.email,
    onboarded: true, // 이메일 회원가입 화면에서 닉네임까지 이미 받았으니 온보딩 완료로 처리
    password: payload.password,
  };

  writeMockAccounts({ ...accounts, [payload.email]: account });
  return { token: `${MOCK_ACCOUNT_TOKEN_PREFIX}${payload.email}`, onboarded: true };
}

function mockLogin(payload: EmailLoginPayload): EmailAuthResult {
  const accounts = readMockAccounts();
  const account = accounts[payload.email];
  if (!account || account.password !== payload.password) {
    throw new Error("이메일 또는 비밀번호가 올바르지 않아요.");
  }
  return { token: `${MOCK_ACCOUNT_TOKEN_PREFIX}${payload.email}`, onboarded: account.onboarded };
}

export async function signupWithEmail(payload: EmailSignupPayload): Promise<EmailAuthResult> {
  try {
    return await apiFetch<EmailAuthResult>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] 회원가입 실 API 호출 실패 → 로컬 테스트 계정으로 대체합니다.", err);
      return mockSignup(payload);
    }
    throw err;
  }
}

export async function loginWithEmail(payload: EmailLoginPayload): Promise<EmailAuthResult> {
  try {
    return await apiFetch<EmailAuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] 로그인 실 API 호출 실패 → 로컬 테스트 계정으로 대체합니다.", err);
      return mockLogin(payload);
    }
    throw err;
  }
}

// -------------------- 아이디(provider_id) + 이메일로 로그인 (DEV 계정용) --------------------
//
// DB의 customer 테이블에 provider='DEV'로 미리 만들어둔 계정(dev-tester1 등)에
// 비밀번호 컬럼이 없어서, 아이디+이메일 조합으로 로그인하는 방식이에요.
// ⚠️ 이걸 실제로 처리하는 백엔드 엔드포인트가 아직 없어서(확인 필요), 지금은
// 실 API를 먼저 시도하고 실패하면 로컬에서 아이디+이메일을 그대로 받아들여
// 화면 흐름만 테스트할 수 있게 했어요. 실제 DB의 그 계정으로 로그인되는 게 아닙니다.

export interface DevLoginPayload {
  providerId: string; // DB의 provider_id (예: dev-tester1)
  email: string;
}

function mockDevLogin(payload: DevLoginPayload): EmailAuthResult {
  const accounts = readMockAccounts();
  const key = `dev:${payload.providerId}`;
  const existing = accounts[key];

  const account: MockAccount = existing ?? {
    id: Date.now(),
    provider: "EMAIL",
    nickname: payload.providerId,
    profileImage: null,
    phone: null,
    email: payload.email,
    onboarded: true,
    password: "",
  };

  if (!existing) {
    writeMockAccounts({ ...accounts, [key]: account });
  }

  return { token: `${MOCK_ACCOUNT_TOKEN_PREFIX}${key}`, onboarded: account.onboarded };
}

export async function loginWithDevAccount(payload: DevLoginPayload): Promise<EmailAuthResult> {
  try {
    // TODO(백엔드 확인 필요): 실제 엔드포인트 경로/요청 형식이 다르면 여기만 고치면 됩니다.
    return await apiFetch<EmailAuthResult>("/api/auth/dev-login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] DEV 로그인 실 API 호출 실패 → 로컬에서 화면 흐름만 진행합니다.", err);
      return mockDevLogin(payload);
    }
    throw err;
  }
}