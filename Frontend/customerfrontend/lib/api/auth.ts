export type Provider = "kakao" | "google";

export interface SocialLoginResult {
  provider: Provider;
  isNewUser: boolean;
}

export interface SignupFormData {
  provider: Provider;
  nickname: string;
  phone: string;
  email: string;
  agreedTerms: Record<string, boolean>;
}

// TODO(백엔드 연동): 실제 카카오 OAuth 리다이렉트 URL로 교체
export async function loginWithKakao(): Promise<SocialLoginResult> {
  console.warn("[TODO] 카카오 API 연동 필요 — 지금은 mock 응답을 반환합니다.");
  return mockSocialLoginResponse("kakao");
}

// TODO(백엔드 연동): 실제 구글 OAuth 리다이렉트 URL로 교체
export async function loginWithGoogle(): Promise<SocialLoginResult> {
  console.warn("[TODO] 구글 API 연동 필요 — 지금은 mock 응답을 반환합니다.");
  return mockSocialLoginResponse("google");
}

// TODO(백엔드 연동): 회원정보 + 약관 동의 제출 API로 교체
export async function submitSignupInfo(formData: SignupFormData): Promise<{ success: boolean }> {
  console.warn("[TODO] 회원정보 제출 API 연동 필요", formData);
  await delay(300);
  return { success: true };
}

// TODO(백엔드 연동): 취향(관심 카테고리) 저장 API로 교체
export async function submitPreferences(selectedCategories: string[]): Promise<{ success: boolean }> {
  console.warn("[TODO] 취향 저장 API 연동 필요", selectedCategories);
  await delay(300);
  return { success: true };
}

async function mockSocialLoginResponse(provider: Provider): Promise<SocialLoginResult> {
  await delay(300);
  const isNewUser = window.confirm(
    `[개발용 확인창] ${provider} 로그인 — 신규 회원으로 테스트할까요?\n(확인: 신규 회원 / 취소: 기존 회원)`
  );
  return { provider, isNewUser };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}