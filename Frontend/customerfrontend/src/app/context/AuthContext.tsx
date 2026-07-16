import { createContext, useContext, useState, ReactNode } from "react";

type Provider = "kakao" | "google";
type User = {
  nickname: string;
  provider: Provider;
  interests: string[]; // 가입 시 관심 카테고리 설문 결과
};

type AuthContextType = {
  user: User | null;
  login: (provider: Provider, interests: string[]) => void;
  logout: () => void;
  withdraw: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (provider: Provider, interests: string[]) =>
    setUser({ nickname: provider === "kakao" ? "팝콘러버" : "PopupFan", provider, interests });
  const logout = () => setUser(null);
  const withdraw = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, withdraw }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
