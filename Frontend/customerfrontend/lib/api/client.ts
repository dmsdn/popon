// 기본은 상대 경로("") — next.config.ts rewrites가 /api/* 를 통합 백엔드(8080)로 프록시한다.
// (구 8081 소비자 백엔드는 통합되어 더 이상 없음)
import { markBackendDown, markBackendUp } from "@/lib/backendStatus";

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch (networkError) {
    // fetch 자체가 실패 = 백엔드에 연결조차 안 됐다는 뜻 (서버 꺼짐, 프록시 연결 끊김 등)
    markBackendDown();
    throw networkError;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    // 500 응답에 아무 message도 없는 건 지금까지 겪어본 바로는 대부분
    // "백엔드가 제대로 안 떠있거나 막 재시작 중"일 때 나오는 패턴이었어요.
    // (진짜 서버 로직 버그로 인한 500도 이 신호를 탈 수 있긴 하지만,
    //  화면이 조용히 mock으로 대체되고 배너로 알려주는 편이 아무 반응 없는 것보단 나아요.)
    const message = await res.text().catch(() => "");
    if (res.status >= 500) {
      markBackendDown();
    }
    throw new Error(message || `요청에 실패했어요. (${res.status})`);
  }

  markBackendUp();
  if (res.status === 204) return undefined as T;
  return res.json();
}

export { API_BASE };