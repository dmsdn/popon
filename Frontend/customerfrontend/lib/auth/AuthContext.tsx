"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getToken, setToken, clearToken, registerForceLogoutHandler } from "@/lib/api/client";
import { getMyInfo, type CustomerInfo } from "@/lib/api/customer";
import { resetWishlistStore } from "@/lib/wishlistStore";
import { appAlert } from "@/lib/ui/alertStore";

interface AuthContextValue {
  isLoggedIn: boolean;
  loading: boolean;
  customer: CustomerInfo | null;
  refresh: () => Promise<void>;
  logout: () => void;
  /** TODO(실제 카카오 연동 후 제거): CORS로 백엔드/카카오 로그인이 막혀있는 동안
   *  "테스트 계정으로 계속하기" 버튼에서 호출해서 화면 흐름만 테스트합니다. */
  loginAsTestUser: () => void;
  /** 회원정보 입력/취향 선택 단계에서 백엔드 저장이 실패해도
   *  화면상 로그인 상태에 입력값을 반영해서 계속 진행할 수 있게 해줍니다. */
  updateMockCustomer: (patch: Partial<CustomerInfo>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const MOCK_TOKEN = "TEST_MODE_TOKEN";
const MOCK_STORAGE_KEY = "mock_customer";
// 이메일/비밀번호로 만든 "여러 개의" 테스트 계정용 — 토큰이 "MOCK_ACCOUNT:이메일" 형태입니다.
const MOCK_ACCOUNT_TOKEN_PREFIX = "MOCK_ACCOUNT:";
const MOCK_ACCOUNTS_KEY = "mock_accounts";

const DEFAULT_MOCK_CUSTOMER: CustomerInfo = {
  id: 0,
  provider: "KAKAO",
  nickname: "테스트유저",
  profileImage: null,
  phone: null,
  email: null,
  birthDate: null,
  gender: null,
  onboarded: false, // 회원가입 화면부터 테스트하기 위해 false로 시작
};

function readMockCustomer(): CustomerInfo | null {
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeMockCustomer(customer: CustomerInfo | null) {
  try {
    if (customer) {
      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(customer));
    } else {
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
    }
  } catch (error) {
    console.error("테스트 유저 저장 실패", error);
  }
}

// 이메일/비밀번호로 회원가입한 "여러 개의" 테스트 계정 저장소 (lib/api/auth.ts의
// signupWithEmail/loginWithEmail이 여기에 쓰고 읽어요). 이메일을 key로 저장합니다.
function readMockAccounts(): Record<string, CustomerInfo & { password: string }> {
  try {
    const raw = window.localStorage.getItem(MOCK_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function findMockAccountCustomer(email: string): CustomerInfo | null {
  const accounts = readMockAccounts();
  const account = accounts[email];
  if (!account) return null;
  const { password: _password, ...customer } = account;
  return customer;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // effect 본문과 같은 틱에서 setState가 동기적으로 실행되지 않도록
    // 마이크로태스크 한 번을 거쳐서 시작합니다.
    await Promise.resolve();

    const token = getToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    // 테스트 모드 토큰이면 백엔드 호출 없이 로컬에 저장된 테스트 유저를 그대로 씁니다.
    if (token === MOCK_TOKEN) {
      setCustomer(readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER);
      setLoading(false);
      return;
    }

    // 이메일/비밀번호로 로그인한 테스트 계정 (여러 개 중 하나)
    if (token.startsWith(MOCK_ACCOUNT_TOKEN_PREFIX)) {
      const email = token.slice(MOCK_ACCOUNT_TOKEN_PREFIX.length);
      const account = findMockAccountCustomer(email);
      setCustomer(account);
      setLoading(false);
      return;
    }

    try {
      const info = await getMyInfo();
      // [신규] 로그아웃 없이 다른 계정으로 바로 로그인되는 경우를 대비한 안전장치 -
      // 새로 불러온 계정 id가 이전과 다르면 찜 목록 캐시도 같이 비워서, 이전 계정의
      // 찜 목록이 새 계정 화면에 잘못 남아있지 않게 해요.
      setCustomer((prev) => {
        if (prev && prev.id !== info.id) resetWishlistStore();
        return info;
      });
    } catch (err) {
      console.error("내 정보 조회 실패", err);
      if (process.env.NODE_ENV === "development") {
        // CORS 등으로 실패해도 개발 중엔 테스트 유저로 대체
        setCustomer(readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER);
      } else {
        setCustomer(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  queueMicrotask(() => {
    void refresh();
  });
}, [refresh]);

  const logout = () => {
    clearToken();
    writeMockCustomer(null);
    setCustomer(null);
    resetWishlistStore();
  };

  // [신규] apiFetch가 401을 받으면(토큰 자체가 무효/만료됐거나, 계정이 이미
  // 탈퇴된 경우 등) 여기 등록해둔 핸들러가 불려서, localStorage 토큰뿐 아니라
  // React의 customer 상태·찜 목록 캐시까지 한 번에 정리하고 로그인 화면으로
  // 보내요. (참고: 탈퇴한 계정의 예전 토큰 자체는 서명/만료 여부만 검증되고
  // "계정이 실제로 존재하는지"는 백엔드가 아직 확인 안 하고 있어서, 이 힘만으론
  // 다른 기기의 세션이 "즉시" 끊기진 않아요 - 그 부분은 백엔드에서 JWT
  // 검증 시 계정 존재 여부까지 확인하도록 고쳐주셔야 완전히 해결돼요.)
  useEffect(() => {
    registerForceLogoutHandler(() => {
      logout();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // [수정] window.alert()는 동기라서 사용자가 확인을 누를 때까지 페이지
        // 이동이 자동으로 미뤄졌는데, appAlert()는 비동기라 그냥 두면 모달이
        // 뜨자마자 바로 로그인 화면으로 이동해버려요. .then()으로 모달을 닫은
        // 뒤에 이동하도록 순서를 맞췄어요.
        appAlert("로그인이 만료되었거나 계정 정보가 변경됐어요. 다시 로그인해주세요.").then(() => {
          window.location.href = "/login";
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginAsTestUser = () => {
    setToken(MOCK_TOKEN);
    const next = readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER;
    writeMockCustomer(next);
    setCustomer(next);
    resetWishlistStore();
  };

  const updateMockCustomer = (patch: Partial<CustomerInfo>) => {
    const token = getToken();

    // 이메일 계정으로 로그인 중이면 mock_accounts 쪽 데이터를 갱신해요.
    if (token?.startsWith(MOCK_ACCOUNT_TOKEN_PREFIX)) {
      const email = token.slice(MOCK_ACCOUNT_TOKEN_PREFIX.length);
      const accounts = readMockAccounts();
      const account = accounts[email];
      if (account) {
        const nextAccount = { ...account, ...patch };
        const nextAccounts = { ...accounts, [email]: nextAccount };
        try {
          window.localStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(nextAccounts));
        } catch (error) {
          console.error("테스트 계정 저장 실패", error);
        }
        const { password: _password, ...customer } = nextAccount;
        setCustomer(customer);
      }
      return;
    }

    setCustomer((prev) => {
      const next = { ...(prev ?? DEFAULT_MOCK_CUSTOMER), ...patch };
      writeMockCustomer(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!customer, loading, customer, refresh, logout, loginAsTestUser, updateMockCustomer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있어요.");
  return ctx;
}