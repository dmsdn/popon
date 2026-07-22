// 기본은 상대 경로("") — next.config.ts rewrites가 /api/* 를 통합 백엔드(8080)로 프록시한다.
// (구 8081 소비자 백엔드는 통합되어 더 이상 없음)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export function setToken(token: string) {
  localStorage.setItem("accessToken", token);
}

export function clearToken() {
  localStorage.removeItem("accessToken");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    const message = await res.text().catch(() => "");
    throw new Error(message || `요청에 실패했어요. (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_BASE };