// lib/auth/AuthContext.tsx
// 로그인 상태(토큰/내 정보)를 앱 전체에 제공하는 인증 Context - 로그인/로그아웃/갱신을 담당
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getToken, setToken, clearToken, registerForceLogoutHandler } from "@/lib/api/client";
import { getMyInfo, type CustomerInfo } from "@/lib/api/customer";
import { resetWishlistStore } from "@/lib/wishlistStore";
import { appAlert } from "@/lib/ui/alertStore";
import { decodeJwtPayload } from "@/lib/utils/decodeJwtPayload";

interface AuthContextValue {
  isLoggedIn: boolean;
  loading: boolean;
  customer: CustomerInfo | null;
  refresh: () => Promise<void>;
  logout: () => void;
  loginAsTestUser: () => void;
  updateMockCustomer: (patch: Partial<CustomerInfo>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
// 개발용 테스트 로그인
const MOCK_TOKEN = "TEST_MODE_TOKEN";
const MOCK_STORAGE_KEY = "mock_customer";
// 이메일/비밀번호로 생성한 여러 테스트 계정
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

// 이메일을 key로 사용하는 테스트 계정 저장소
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
    // effect와 같은 틱에서 상태가 바로 변경되지 않도록 한 번 지연
    await Promise.resolve();

    const token = getToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    // 기본 테스트 계정은 백엔드 대신 localStorage의 사용자 정보 사용
    if (token === MOCK_TOKEN) {
      setCustomer(readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER);
      setLoading(false);
      return;
    }

    // 이메일/비밀번호 테스트 계정
    if (token.startsWith(MOCK_ACCOUNT_TOKEN_PREFIX)) {
      const email = token.slice(MOCK_ACCOUNT_TOKEN_PREFIX.length);
      const account = findMockAccountCustomer(email);
      setCustomer(account);
      setLoading(false);
      return;
    }

    // 소셜 로그인 후 회원정보 입력 전의 가입대기 토큰은 customer id가 없어 /me API를 호출할 수 없으므로 로그인 상태로 처리하지 않음
    const claims = decodeJwtPayload<{ pending?: boolean }>(token);
    if (claims?.pending) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    try {
      const info = await getMyInfo();
      // 다른 계정으로 로그인한 경우 이전 계정의 찜 목록 캐시 초기화
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

 // 로그아웃 시 토큰, 사용자 정보, 찜 목록을 함께 초기화
  const logout = () => {
    clearToken();
    writeMockCustomer(null);
    setCustomer(null);
    resetWishlistStore();
  };

  // API에서 401 응답을 받으면 강제 로그아웃 처리
  useEffect(() => {
    registerForceLogoutHandler(() => {
      logout();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // 비동기 모달이 닫힌 뒤 로그인 페이지로 이동
        appAlert("로그인이 만료되었거나 계정 정보가 변경됐어요. 다시 로그인해주세요.").then(() => {
          window.location.href = "/login";
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기본 테스트 계정으로 로그인
  const loginAsTestUser = () => {
    setToken(MOCK_TOKEN);
    const next = readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER;
    writeMockCustomer(next);
    setCustomer(next);
    resetWishlistStore();
  };

   // 테스트 계정의 사용자 정보 수정
  const updateMockCustomer = (patch: Partial<CustomerInfo>) => {
    const token = getToken();

    // 이메일 계정으로 로그인 중이면 mock_accounts 쪽 데이터 갱신
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

    // 기본 테스트 계정 정보 갱신
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
