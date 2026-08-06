// lib/api/client.ts
// 백엔드 API를 호출할 때 공통으로 사용하는 API 클라이언트

// 기본은 상대 경로("") — next.config.ts rewrites가 /api/* 를 통합 백엔드(8080)로 프록시
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

// [신규] 401 인증 오류 발생 시 React의 인증 상태와 찜 목록 등 관련 상태까지 함께 초기화하는 전체 로그아웃 처리로 개선
// AuthContext가 앱 시작 시 콜백을 등록하고, apiFetch가 401 응답을 받으면 실제 로그아웃 처리가 실행되도록 연결
let onForceLogout: (() => void) | null = null;
export function registerForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

// [수정] API 에러에 HTTP 상태 코드(status)와 네트워크 연결 실패 여부(isNetworkError)를 추가
// 백엔드 연결 장애와 실제 API 오류(예: 404)를 구분할 수 있도록 수정
// withMockFallback이 백엔드가 연결되지 않은 경우에만 목업 데이터로 대체하고, 존재하지 않는 팝업 등의 정상적인 404 응답은 그대로 처리
export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      // [수정] fetch()의 GET 응답이 브라우저에 캐싱되는 것을 방지하도록 기본 캐시를 사용하지 않게 수정
      // 웨이팅 현황처럼 실시간으로 변경되는 데이터를 다시 요청할 때 항상 최신 응답을 받아오도록 개선
      cache: "no-store",
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
    throw new ApiError(
      networkError instanceof Error ? networkError.message : "네트워크 오류",
      undefined,
      true
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      onForceLogout?.();
    }
    // [수정] 500 응답에 에러 메시지가 없는 경우에는 백엔드가 정상적으로 실행되지 않았거나 재시작 중인 상황으로 판단해, 
    // 화면을 목업 데이터로 대체하고 연결 상태를 안내하도록 처리
    // 임시 데이터로 화면을 유지하면서 사용자에게 상태를 알려주도록 개선
    // *주의* 실제 서버 로직 오류로 인한 500도 포함될 수 있음
    const rawText = await res.text().catch(() => "");
    // [수정] JSON 전체가 화면에 노출되지 않도록 message 필드의 실제 오류 내용만 추출해 사용자에게 자연스러운 에러 메시지가 표시되도록 개선
    let message = rawText;
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // JSON이 아니면(순수 텍스트/빈 응답 등) rawText를 그대로 사용
    }
    if (res.status >= 500) {
      markBackendDown();
    }
    throw new ApiError(message || `요청에 실패했어요. (${res.status})`, res.status);
  }

  markBackendUp();
  if (res.status === 204) return undefined as T;
  // [수정] 응답 본문이 비어 있으면 undefined를 반환하도록 처리
  // 서버의 정상 응답을 프론트에서도 성공으로 인식하도록 개선
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export { API_BASE };