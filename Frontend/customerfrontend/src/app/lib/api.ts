// 백엔드 연동 API 클라이언트
// - 팝업 조회: 주최자측 백엔드(popupbackend :8080)의 공개 API → vite 프록시(/api)
// - 카카오 로그인: 소비자측 백엔드(customerbackend :8081) → 전체 페이지 리다이렉트 방식
import type { Popup } from "../data";

export const CUSTOMER_BACKEND = "http://localhost:8081";
export const KAKAO_LOGIN_URL = `${CUSTOMER_BACKEND}/oauth2/authorization/kakao`;

const TOKEN_KEY = "customerToken";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// JWT payload 디코드 (customerbackend가 id, nickname 클레임을 넣어줌)
export type TokenPayload = { id: number; nickname: string; exp: number };

export function decodeToken(token: string): TokenPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(json) as TokenPayload;
    if (payload.exp * 1000 < Date.now()) return null; // 만료
    return payload;
  } catch {
    return null;
  }
}

// ── 팝업 조회 (popupbackend 공개 API) ──

export type BackendPopup = {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  status: "BEFOR" | "OPEN" | "CLOSED";
  createdAt: string;
};

// 소비자에게 노출 가능한 상태 (심사 대기·반려·관리자 게시중지는 숨김)
const VISIBLE_STATUSES = ["BEFOR", "OPEN", "CLOSED"];

export async function fetchPopups(): Promise<BackendPopup[]> {
  const res = await fetch("/api/popups");
  if (!res.ok) throw new Error(`팝업 목록을 불러오지 못했어요. (${res.status})`);
  const all: BackendPopup[] = await res.json();
  return all.filter((p) => VISIBLE_STATUSES.includes(p.status));
}

export async function fetchPopup(id: string | number): Promise<BackendPopup> {
  const res = await fetch(`/api/popups/${id}`);
  if (!res.ok) throw new Error(`팝업 정보를 불러오지 못했어요. (${res.status})`);
  const p: BackendPopup = await res.json();
  if (!VISIBLE_STATUSES.includes(p.status)) {
    throw new Error("게시가 중지되었거나 준비 중인 팝업이에요.");
  }
  return p;
}

// ── 백엔드 응답 → UI Popup 타입 어댑터 ──
// 백엔드에 아직 없는 필드(이미지·평점·혼잡도 등)는 기본값/플레이스홀더로 채운다.

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&h=600&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=800&h=600&fit=crop&auto=format",
];

const STATUS_LABEL: Record<BackendPopup["status"], string> = {
  BEFOR: "오픈예정",
  OPEN: "운영중",
  CLOSED: "종료",
};

const fmtMD = (iso: string | null) => (iso ? `${iso.slice(5, 7)}.${iso.slice(8, 10)}` : "미정");
const fmtHM = (iso: string | null) => (iso ? iso.slice(11, 16) : "00:00");

// ── 소비자 기능 API (customerbackend :8081, vite 프록시 /api/customer) ──
// 모든 요청은 Authorization: Bearer <JWT> 필요 (컨트롤러가 직접 파싱)

class CustomerApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function customerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new CustomerApiError(401, "로그인이 필요해요.");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };
  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new CustomerApiError(0, "서버에 연결할 수 없어요. 소비자 백엔드(8081)가 실행 중인지 확인해 주세요.");
  }
  if (!res.ok) throw new CustomerApiError(res.status, `요청에 실패했어요. (${res.status})`);
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// 찜 목록
export function getWishlist() {
  return customerRequest<number[]>("/api/customer/wishlist");
}
export function addWishlist(popupId: number) {
  return customerRequest<{ success: boolean }>("/api/customer/wishlist", {
    method: "POST",
    body: JSON.stringify({ popupId }),
  });
}
export function removeWishlist(popupId: number) {
  return customerRequest<{ success: boolean }>(`/api/customer/wishlist/${popupId}`, { method: "DELETE" });
}

// 예약
export type CustomerReservation = {
  id: number;
  customerId: number;
  popupId: number;
  visitDate: string; // yyyy-MM-dd
  visitTime: string; // HH:mm:ss
  partySize: number;
  status: "CONFIRMED" | "WAITING" | "CANCELLED" | "VISITED";
  createdAt: string;
};

export function createReservation(data: { popupId: number; visitDate: string; visitTime: string; partySize: number }) {
  return customerRequest<CustomerReservation>("/api/customer/reservations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function getMyReservations() {
  return customerRequest<CustomerReservation[]>("/api/customer/reservations");
}
export function cancelReservation(id: number) {
  return customerRequest<{ success: boolean }>(`/api/customer/reservations/${id}/cancel`, { method: "PATCH" });
}

// 리뷰
export type CustomerReview = {
  id: number;
  customerId: number;
  popupId: number;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export function createReview(data: { popupId: number; rating: number; content: string }) {
  return customerRequest<CustomerReview>("/api/customer/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
export function getMyReviews() {
  return customerRequest<CustomerReview[]>("/api/customer/reviews");
}
export function deleteReview(id: number) {
  return customerRequest<{ success: boolean }>(`/api/customer/reviews/${id}`, { method: "DELETE" });
}

// 관심 카테고리 (키워드)
// 키워드 목록 조회 API가 없어 keyword 테이블 시드 순서(id 1~8)와 짝을 맞춘 고정 매핑 사용
// (data.ts CATEGORIES 순서와 동일: 패션=1, 뷰티=2, F&B=3, 캐릭터=4, 라이프스타일=5, 아트=6, 테크=7, 엔터테인먼트=8)
export const KEYWORD_IDS: Record<string, number> = {
  패션: 1, 뷰티: 2, "F&B": 3, 캐릭터: 4, 라이프스타일: 5, 아트: 6, 테크: 7, 엔터테인먼트: 8,
};

export function saveInterests(categoryNames: string[]) {
  const keywordIds = categoryNames.map((n) => KEYWORD_IDS[n]).filter(Boolean);
  return customerRequest<{ success: boolean; count: number }>("/api/customer/interests", {
    method: "POST",
    body: JSON.stringify({ keywordIds }),
  });
}

export function toUiPopup(p: BackendPopup): Popup {
  return {
    id: String(p.id),
    name: p.title,
    brand: p.companyName,
    brandId: String(p.businessId),
    category: STATUS_LABEL[p.status],
    period: `${fmtMD(p.startDate)} — ${fmtMD(p.endDate)}`,
    hours: `매일 ${fmtHM(p.startDate)} — ${fmtHM(p.endDate)}`,
    location: p.location ?? "장소 미정",
    area: p.location ? p.location.split(" ")[0] : "기타",
    image: PLACEHOLDER_IMAGES[p.id % PLACEHOLDER_IMAGES.length],
    rating: 0, // 리뷰 API 미구현
    reviewCount: 0,
    entry: p.status === "BEFOR" ? "사전예약제" : "현장대기",
    congestion: "여유", // 혼잡도 API 미구현
    waitingTeams: 0,
    intro: p.description,
    notice: [],
    tags: [p.companyName, STATUS_LABEL[p.status]],
    hot: p.status === "OPEN",
  };
}
