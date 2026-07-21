import { createContext, useContext, useState, ReactNode } from "react";
import * as api from "../lib/api";

type User =
  | { role: "business"; name: string; email: string; businessId: number }
  | { role: "admin"; name: string; email: string; adminId: number };

type AuthContextType = {
  user: User | null;
  // needsReconsent: 개인정보 동의 보관기간 만료 → 재동의 필요 (호출부에서 안내 후 businessReconsent 호출)
  login: (email: string, password: string) => Promise<{ needsReconsent: boolean }>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "authUser";

function loadUser(): User | null {
  if (!api.getToken()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 구버전 저장분(role 없음)은 사업자 계정으로 간주
    if (!parsed.role) parsed.role = "business";
    return parsed as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    api.setToken(res.accessToken);
    const u: User = { role: "business", name: res.companyName, email, businessId: res.businessId };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return { needsReconsent: res.needsReconsent === true };
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await api.adminLogin(email, password);
    api.setToken(res.accessToken);
    const u: User = { role: "admin", name: res.name, email, adminId: res.adminId };
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    api.clearToken();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
