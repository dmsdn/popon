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

// [신규] 401이 오면 지금까지는 localStorage의 토큰만 지웠어요 - React 쪽
// customer 상태, 찜 목록 캐시 등은 그대로 남아있어서 화면상으론 로그인된
//것처럼 계속 보였어요. AuthContext가 앱 시작 시 이 콜백을 등록해두면,
// apiFetch가 401을 받을 때마다 진짜 "전체 로그아웃"을 실행할 수 있어요.
let onForceLogout: (() => void) | null = null;
export function registerForceLogoutHandler(handler: () => void) {
  onForceLogout = handler;
}

// [수정] 지금까지 에러를 그냥 Error(message)로만 던져서, mock 대체 로직(withMockFallback)이
// "백엔드가 아예 안 떠있음"과 "백엔드는 정상인데 이 데이터가 없음(404 등)"을 구분할
// 방법이 없었어요. 그래서 존재하지 않는 팝업 같은 정상적인 404까지도 mock 데이터로
// 조용히 덮어버리는 문제가 있었어요. status/isNetworkError를 실어서 구분 가능하게 했습니다.
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
      // [수정 8/5] "웨이팅 등록 직후 대기 현황 숫자가 새로고침 전까지 그대로다"
      // 신고를 다시 보니, 프론트 state 갱신 코드는 정상인데도 안 바뀌는
      // 경우였어요 - .next 캐시를 지워도 그대로였다는 게 결정적인 단서였습니다
      // (그건 빌드 캐시 문제가 아니라는 뜻이니까요). fetch()에 cache 옵션을
      // 아무것도 안 주면 브라우저가 GET 응답을 자체적으로 캐싱해서, 같은
      // API를 다시 불러도 네트워크를 안 타고 방금 전 응답을 그대로 재사용할
      // 수 있어요. 이 앱은 실시간성 있는 데이터를 계속 다시 받아와야 하니
      // 기본적으로 캐시를 아예 안 쓰게 했어요.
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
    // 500 응답에 아무 message도 없는 건 지금까지 겪어본 바로는 대부분
    // "백엔드가 제대로 안 떠있거나 막 재시작 중"일 때 나오는 패턴이었어요.
    // (진짜 서버 로직 버그로 인한 500도 이 신호를 탈 수 있긴 하지만,
    //  화면이 조용히 mock으로 대체되고 배너로 알려주는 편이 아무 반응 없는 것보단 나아요.)
    const rawText = await res.text().catch(() => "");
    // 백엔드(GlobalExceptionHandler)는 에러를 { "message": "..." } 형태의 JSON으로 내려주는데,
    // 지금까지는 이 JSON을 그대로 문자열로 써서 화면/로직에 원본 JSON이 그대로 노출됐어요.
    // (예: "이미 이 팝업에 리뷰를 작성하셨어요." 대신 {"message":"이미 이 팝업에 리뷰를 작성하셨어요."} 가 통째로 표시됨)
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
  // [수정 7/31] 204 말고 **200인데 본문이 빈** 응답도 있어요. 스프링에서
  // ResponseEntity.ok().build() 로 끝내는 엔드포인트가 그래요 (예: 클릭 로그 기록
  // POST /api/popups/{id}/click). 이걸 그대로 res.json()에 넘기면
  // "Unexpected end of JSON input"이 나서, 서버는 200으로 잘 처리했는데 프론트만
  // 실패로 인식했어요. 빈 본문이면 undefined로 돌려줘요.
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export { API_BASE };