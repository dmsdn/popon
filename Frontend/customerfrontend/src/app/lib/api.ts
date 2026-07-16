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

export async function fetchPopups(): Promise<BackendPopup[]> {
  const res = await fetch("/api/popups");
  if (!res.ok) throw new Error(`팝업 목록을 불러오지 못했어요. (${res.status})`);
  return res.json();
}

export async function fetchPopup(id: string | number): Promise<BackendPopup> {
  const res = await fetch(`/api/popups/${id}`);
  if (!res.ok) throw new Error(`팝업 정보를 불러오지 못했어요. (${res.status})`);
  return res.json();
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
