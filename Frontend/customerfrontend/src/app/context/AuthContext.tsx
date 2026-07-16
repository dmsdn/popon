import { createContext, useContext, useState, ReactNode } from "react";
import { getToken, setToken, clearToken, decodeToken } from "../lib/api";

type Provider = "kakao" | "google";
type User = {
  id: number;
  nickname: string;
  provider: Provider;
  interests: string[]; // 가입 시 관심 카테고리 설문 결과 (로컬 저장)
};

type AuthContextType = {
  user: User | null;
  loginWithToken: (token: string) => boolean; // 카카오 로그인 성공 후 백엔드가 발급한 JWT 수신
  logout: () => void;
  withdraw: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const INTERESTS_KEY = "interests";

function loadInterests(): string[] {
  try {
    return JSON.parse(localStorage.getItem(INTERESTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function loadUser(): User | null {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) {
    clearToken(); // 만료/손상된 토큰 정리
    return null;
  }
  return { id: payload.id, nickname: payload.nickname, provider: "kakao", interests: loadInterests() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const loginWithToken = (token: string) => {
    const payload = decodeToken(token);
    if (!payload) return false;
    setToken(token);
    setUser({ id: payload.id, nickname: payload.nickname, provider: "kakao", interests: loadInterests() });
    return true;
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };
  const withdraw = logout; // 회원탈퇴 API 미구현 — 로컬 로그아웃과 동일 처리

  return (
    <AuthContext.Provider value={{ user, loginWithToken, logout, withdraw }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
