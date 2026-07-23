"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getToken, setToken, clearToken } from "@/lib/api/client";
import { getMyInfo, type CustomerInfo } from "@/lib/api/customer";

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
      setCustomer(info);
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
  };

  const loginAsTestUser = () => {
    setToken(MOCK_TOKEN);
    const next = readMockCustomer() ?? DEFAULT_MOCK_CUSTOMER;
    writeMockCustomer(next);
    setCustomer(next);
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