// lib/auth.ts
// 주최측(business) 로그인 토큰과 선택된 팝업 정보를 sessionStorage에 저장/조회해요.
// 태블릿에 계속 켜둘 화면이라 로그인은 한 번만 하면 되고, 브라우저를 완전히
// 닫기 전까진 유지돼요(sessionStorage). 기기를 공유하지 않는 전용 태블릿이라면
// localStorage로 바꿔서 더 오래 유지되게 해도 돼요.

const TOKEN_KEY = "popon_staff_token";
const BUSINESS_KEY = "popon_staff_business";
const POPUP_KEY = "popon_staff_popup";

export interface BusinessSession {
  accessToken: string;
  businessId: number;
  companyName: string;
  // [신규] 계정 탭에 표시할 아이디(이메일)와 브랜드 로고 이미지.
  // 로그인 응답에 없으면 undefined로 저장되고, 화면에서는 이니셜 아바타로 대체돼요.
  email?: string;
  profileImageUrl?: string;
}

export interface SelectedPopup {
  id: number;
  title: string;
}

export function saveSession(session: BusinessSession) {
  sessionStorage.setItem(TOKEN_KEY, session.accessToken);
  sessionStorage.setItem(
    BUSINESS_KEY,
    JSON.stringify({
      businessId: session.businessId,
      companyName: session.companyName,
      email: session.email,
      profileImageUrl: session.profileImageUrl,
    })
  );
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getBusinessInfo(): {
  businessId: number;
  companyName: string;
  email?: string;
  profileImageUrl?: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(BUSINESS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(BUSINESS_KEY);
  sessionStorage.removeItem(POPUP_KEY);
}

export function saveSelectedPopup(popup: SelectedPopup) {
  sessionStorage.setItem(POPUP_KEY, JSON.stringify(popup));
}

export function getSelectedPopup(): SelectedPopup | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(POPUP_KEY);
  return raw ? JSON.parse(raw) : null;
}
