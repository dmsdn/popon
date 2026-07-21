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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
    refresh();
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