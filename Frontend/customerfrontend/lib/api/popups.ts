// lib/api/popups.ts
import { apiFetch } from "./client";
import {
  recentPopups,
  openingSoonPopups,
  popularByKeyword,
  type PopupItem,
} from "@/data/mockPopups";

// 백엔드 PopupResponse와 동일한 필드 (domain/popup/dto/PopupResponse.java 기준)
export interface PopupDetail {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  status: "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED";
  rejectReason: string | null;
  createdAt: string;
  areaSqm: number | null;
  recommendedCapacity: number | null;
  capacity: number;
  reservationMode: "SLOT" | "FREE";
  avgExperienceMinutes: number;
  latitude: number | null;
  longitude: number | null;
}

// -------------------- 백엔드 연결 안 될 때를 위한 mock (data/mockPopups.ts 재사용) --------------------
//
// data/mockPopups.ts의 PopupItem(한글 status, 문자열 id)을 백엔드 PopupDetail 모양으로
// 변환해서 씁니다. 여러 mock 배열에 이름이 겹치는 경우가 있어서 이름 기준으로 합치고,
// id는 배열 안 순서로 안정적인 숫자를 새로 매깁니다 (실제 DB id와는 무관해요).

const KOREAN_STATUS_TO_BACKEND: Record<NonNullable<PopupItem["status"]>, PopupDetail["status"]> = {
  예정: "BEFOR",
  진행중: "OPEN",
  종료: "CLOSED",
};

function parseDateRange(dateRange?: string): { start: string; end: string } {
  // "26.08.07 ~ 26.08.13" 형식. 없으면 오늘 기준 1주일로 채워요.
  const now = new Date();
  const fallbackStart = now.toISOString();
  const fallbackEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  if (!dateRange) return { start: fallbackStart, end: fallbackEnd };

  const [rawStart, rawEnd] = dateRange.split("~").map((s) => s.trim());
  const toIso = (s: string) => {
    const [yy, mm, dd] = s.split(".").map((n) => parseInt(n, 10));
    if (!yy || !mm || !dd) return null;
    return new Date(2000 + yy, mm - 1, dd, 10, 0, 0).toISOString();
  };
  return {
    start: toIso(rawStart) ?? fallbackStart,
    end: toIso(rawEnd) ?? fallbackEnd,
  };
}

function buildMockPopupDetails(): PopupDetail[] {
  const all = [...recentPopups, ...openingSoonPopups, ...popularByKeyword["전체"]];
  const byName = new Map<string, PopupItem>();
  all.forEach((item) => {
    if (!byName.has(item.name)) byName.set(item.name, item);
  });

  return [...byName.values()].map((item, index) => {
    const { start, end } = parseDateRange(item.dateRange);
    return {
      id: index + 1,
      businessId: 0,
      companyName: item.name,
      title: item.name,
      description: `${item.name}에서 준비한 팝업스토어예요. (mock 데이터 — 백엔드 연결 시 실제 정보로 교체됩니다)`,
      location: item.location ?? null,
      startDate: start,
      endDate: end,
      status: item.status ? KOREAN_STATUS_TO_BACKEND[item.status] : "OPEN",
      rejectReason: null,
      createdAt: start,
      areaSqm: null,
      recommendedCapacity: null,
      capacity: 30,
      reservationMode: "FREE",
      avgExperienceMinutes: 20,
      latitude: null,
      longitude: null,
    };
  });
}

let mockPopupDetailsCache: PopupDetail[] | null = null;
function getMockPopupDetails(): PopupDetail[] {
  if (!mockPopupDetailsCache) mockPopupDetailsCache = buildMockPopupDetails();
  return mockPopupDetailsCache;
}

function mockGetPopup(popupId: string | number): PopupDetail {
  const found = getMockPopupDetails().find((p) => p.id === Number(popupId));
  if (!found) throw new Error("팝업 정보를 찾을 수 없어요.");
  return found;
}

function mockSearchPopups(params?: { location?: string; status?: string; keyword?: string }): PopupDetail[] {
  return getMockPopupDetails().filter((p) => {
    if (params?.status && p.status !== params.status) return false;
    if (params?.location && p.location !== params.location) return false;
    if (params?.keyword) {
      const k = params.keyword.toLowerCase();
      if (!p.title.toLowerCase().includes(k) && !(p.location?.toLowerCase().includes(k) ?? false)) return false;
    }
    return true;
  });
}

async function withMockFallback<T>(realCall: () => Promise<T>, mockCall: () => T): Promise<T> {
  try {
    return await realCall();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[popups] 실 API 호출 실패 → mock 데이터로 대체합니다.", error);
      return mockCall();
    }
    throw error;
  }
}

// -------------------- 실 API 우선, 실패 시 mock --------------------

export function getPopup(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupDetail>(`/api/popups/${popupId}`),
    () => mockGetPopup(popupId)
  );
}

export function searchPopups(params?: { location?: string; status?: string; keyword?: string }) {
  const query = new URLSearchParams();
  if (params?.location) query.set("location", params.location);
  if (params?.status) query.set("status", params.status);
  if (params?.keyword) query.set("keyword", params.keyword);
  const qs = query.toString();
  return withMockFallback(
    () => apiFetch<PopupDetail[]>(`/api/popups${qs ? `?${qs}` : ""}`),
    () => mockSearchPopups(params)
  );
}

export interface PopupSlot {
  id: number;
  popupId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  remaining: number;
}

export function getPopupSlots(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupSlot[]>(`/api/popups/${popupId}/slots`),
    () => [] as PopupSlot[]
  );
}

// -------------------- 팝업 주변 핫플 (popup_hot_place 테이블) --------------------
//
// ⚠️ 백엔드에 popup_hot_place 테이블은 생겼지만, 이걸 조회하는 API는 아직 없어요
// (컨트롤러 코드 확인 필요 — 백엔드 담당자에게 GET /api/popups/{popupId}/hot-places
// 엔드포인트 추가를 요청해야 해요). 그래서 지금은 실 API를 시도하고, 없으면(404 등)
// 빈 배열로 조용히 대체돼요 — 화면에서는 "팝업 주변 핫플" 섹션이 그냥 비어보입니다.
// 백엔드에 엔드포인트가 생기면 이 함수는 손댈 필요 없이 자동으로 실 데이터를 씁니다.

export interface PopupHotPlace {
  id: number;
  popupId: number;
  category: string; // 예: "카페", "음식점", "패션잡화"
  name: string;
  distance: string | null; // 예: "114m"
  linkUrl: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export function getPopupHotPlaces(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupHotPlace[]>(`/api/popups/${popupId}/hot-places`),
    () => [] as PopupHotPlace[]
  );
}

// -------------------- 실시간 혼잡도 --------------------
//
// [신규 연결] 백엔드 PopupLiveStatusController(GET /api/popups/{popupId}/live-status)가
// 이미 있는데 프론트에서 안 쓰고 있었어요. 최근 체크인/입장 기록 기반으로 계산된
// 현재 인원/정원/혼잡도(여유·보통·혼잡)를 내려줍니다.

export interface PopupLiveStatus {
  popupId: number;
  capacity: number;
  currentOccupancy: number;
  congestionRate: number; // 0.0 ~ 1.0+
  congestionLabel: "여유" | "보통" | "혼잡";
}

export function getPopupLiveStatus(popupId: string | number) {
  return apiFetch<PopupLiveStatus>(`/api/popups/${popupId}/live-status`);
}
