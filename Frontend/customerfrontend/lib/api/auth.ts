import { apiFetch, clearToken } from "./client";

export type Provider = "kakao" | "google";

// OAuth는 fetch가 아니라 전체 페이지 이동이라 rewrites를 타지 않음 — 통합 백엔드 절대 주소로 이동.
// 이 값이 카카오·구글 콘솔에 등록한 Redirect URI의 origin과 정확히 일치해야 한다.
// 특히 구글은 IP 주소를 리디렉션 URI로 아예 받지 않아서(공개 최상위 도메인 필수),
// 배포 환경에서는 nip.io 같은 IP→도메인 매핑을 쓴다 (7/30, DNS 설정 없이 즉시 사용 가능).
// NEXT_PUBLIC_ 접두사가 브라우저 번들에 값을 심어준다 — 서버 전용 BACKEND_ORIGIN과는 별개.
const OAUTH_BASE = process.env.NEXT_PUBLIC_OAUTH_BASE ?? "http://localhost:8080";

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
  termsAgreed: boolean;
  privacyAgreed: boolean;
  locationAgreed: boolean;
  marketingAgreed: boolean;
}

// [수정] 원래 PATCH /api/customer/me를 불렀는데, 그 엔드포인트(CustomerController)는
// nickname/profileImage/birthDate/gender만 받고 phone·email·약관동의는 아예 받지 않아요.
// 그래서 전화번호도 저장 안 되고, signupCompleted도 항상 false로 남아서
// 로그인할 때마다 계속 회원정보 입력 화면으로 돌아가는 문제가 있었어요.
// 실제로 phone/email/약관동의를 받아서 signupCompleted=true까지 처리하는 엔드포인트는
// POST /api/customer/signup-info (SignupInfoController) 이므로 그쪽으로 변경했습니다.
export function submitSignupInfo(payload: SignupInfoPayload) {
  // [수정] 가입대기 토큰(pendingToken)으로 제출하면 백엔드가 이 시점에 처음으로
  // Customer row를 만들고, 그때부터 쓸 수 있는 "진짜" 토큰을 응답에 같이 실어줘요.
  // 이전엔 이 token 필드를 타입에도 안 넣고 그냥 버리고 있었어요.
  return apiFetch<{ success: boolean; customerId: number; token?: string }>("/api/customer/signup-info", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// [수정] PUT /api/customer/me/keywords는 백엔드에 존재하지 않는 경로였어요(전체 검색해도 없음).
// 관심 키워드를 실제로 저장하는 엔드포인트는 POST /api/customer/interests (InterestController) —
// body 형식도 배열이 아니라 { keywordIds: [...] } 형태라 그에 맞춰 같이 고쳤습니다.
export function submitPreferences(keywordIds: number[]) {
  return apiFetch<{ success: boolean; count: number }>("/api/customer/interests", {
    method: "POST",
    body: JSON.stringify({ keywordIds }),
  });
}

// [신규 연결] 로그인 성공 후 "회원정보 입력 화면으로 보낼지" 판단할 때 지금까지 두 군데서
// 다 잘못된 값을 썼어요:
//  - login/success/page.tsx: 백엔드가 리다이렉트 URL에 onboarded 파라미터를 절대 안 붙여줘서
//    (OAuth2SuccessHandler.java 확인 — "?token=..." 뿐, &onboarded= 없음) 항상 false로 읽혀서
//    이미 가입 완료한 회원도 로그인할 때마다 계속 회원정보 입력 화면으로 되돌아갔어요.
//  - login/dev/page.tsx: 반대로 이 값을 아예 안 보고 항상 홈으로 보내서, 방금 만든 신규
//    테스트 계정도 회원정보 입력 화면을 건너뛰었어요.
// 실제로 이 여부를 정확히 내려주는 GET /api/customer/signup-info/status
// (SignupInfoController.getStatus) API가 이미 있는데 프론트 어디서도 안 부르고 있었어서,
// 이 함수로 연결하고 두 로그인 화면 모두 여기서 받은 실제 값으로 라우팅하게 고쳤습니다.
export function getSignupStatus() {
  return apiFetch<{ signupCompleted: boolean }>("/api/customer/signup-info/status");
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