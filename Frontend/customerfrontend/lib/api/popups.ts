// lib/api/popups.ts
// 팝업 상세정보 API
import { apiFetch, ApiError } from "./client";
import { toLocalDateString } from "@/lib/utils/formatLocalDate";
import {
  recentPopups,
  openingSoonPopups,
  popularByKeyword,
  type PopupItem,
} from "@/data/mockPopups";

// 팝업 상세 정보
export interface PopupDetail {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  regionId: number | null; // 지역 필터링
  regionName: string | null;
  startDate: string; // ISO datetime
  endDate: string; // ISO datetime
  status: "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED" | "SUSPENDED";
  rejectReason: string | null;
  createdAt: string;
  areaSqm: number | null;
  notice: string | null; // [신규] 주최측이 남긴 이용 안내 문구 (없으면 프론트에서 기본 안내로 대체)
  recommendedCapacity: number | null;
  capacity: number;
  reservationMode: "SLOT" | "FREE";
  avgExperienceMinutes: number;
  latitude: number | null;
  longitude: number | null;
  queueMode: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null; // 웨이팅/예약 버튼 숨기는 기준
  maxPartySizePerTeam: number | null;
  hashtags: string[]; // 주최측이 직접 입력한 해시태그
  keywordNames: string[]; // 표준 카테고리 이름들 (예: ["패션", "라이프스타일"])
  snsLinks: SnsLink[]; 
  avgRating: number | null; // DB 전체 후기 기준으로 미리 계산해서 내려주는 평균 평점/후기 수
  reviewCount: number;
  thumbnailImages: string[];
  detailImages: string[];
  operatingHours?: { 
    dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    openTime: string | null; // "HH:mm:ss" 형태
    closeTime: string | null;
    closed: boolean;
  }[]; // 요일별 운영시간·휴무일
  wishlistCount?: number; // 찜한 수
  businessPhone?: string | null; //소비자 상세페이지 "전화로 문의하기"
}

// 팝업 SNS 링크 정보
export interface SnsLink {
  id: number;
  platform: "INSTAGRAM" | "YOUTUBE" | "X" | "BLOG" | "HOMEPAGE" | "NAVERMAP" | "ETC";
  url: string;
  displayName: string | null;
  sortOrder: number;
}

// ------------------------------- 백엔드 연결 안 될 때를 위한 mock -------------------------------

// 목업 팝업의 상태값을 백엔드 상태값으로 변환
const KOREAN_STATUS_TO_BACKEND: Record<NonNullable<PopupItem["status"]>, PopupDetail["status"]> = {
  예정: "BEFOR",
  진행중: "OPEN",
  종료: "CLOSED",
};

// 목업 팝업의 날짜 범위를 ISO 날짜 형식으로 변환
function parseDateRange(dateRange?: string): { start: string; end: string } {
  // "26.08.07 ~ 26.08.13" 형식. 없으면 오늘 기준 1주일로
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

// 기존 목업 데이터를 팝업 상세 정보 형식으로 변환
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
      regionId: null,
      regionName: item.location ?? null,
      startDate: start,
      endDate: end,
      status: item.status ? KOREAN_STATUS_TO_BACKEND[item.status] : "OPEN",
      rejectReason: null,
      createdAt: start,
      areaSqm: null,
      notice: null,
      recommendedCapacity: null,
      capacity: 30,
      reservationMode: "FREE",
      avgExperienceMinutes: 20,
      latitude: null,
      longitude: null,
      queueMode: null,
      maxPartySizePerTeam: null,
      hashtags: item.category ? [item.category] : [],
      keywordNames: item.category ? [item.category] : [],
      snsLinks: [],
      avgRating: null,
      reviewCount: 0,
      thumbnailImages: [],
      detailImages: [],
    };
  });
}

let mockPopupDetailsCache: PopupDetail[] | null = null;

// 목업 팝업 데이터를 한 번 생성해 재사용
function getMockPopupDetails(): PopupDetail[] {
  if (!mockPopupDetailsCache) mockPopupDetailsCache = buildMockPopupDetails();
  return mockPopupDetailsCache;
}

// 목업 팝업 상세 조회
function mockGetPopup(popupId: string | number): PopupDetail {
  const found = getMockPopupDetails().find((p) => p.id === Number(popupId));
  if (!found) throw new Error("팝업 정보를 찾을 수 없어요.");
  return found;
}

// 목업 팝업 검색
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

// API 호출 실패 시 개발 환경에서 목업 데이터로 대체
async function withMockFallback<T>(realCall: () => Promise<T>, mockCall: () => T): Promise<T> {
  try {
    return await realCall();
  } catch (error) {
    const isConnectivityIssue = error instanceof ApiError && (error.isNetworkError || (error.status ?? 0) >= 500);
    if (process.env.NODE_ENV === "development" && isConnectivityIssue) {
      console.warn("[popups] 실 API 호출 실패 → mock 데이터로 대체합니다.", error);
      return mockCall();
    }
    throw error;
  }
}

// -------------------- 실 API 우선, 실패 시 mock --------------------

//팝업 상세 정보 조회
export function getPopup(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupDetail>(`/api/popups/${popupId}`),
    () => mockGetPopup(popupId)
  );
}

// 찜 개수 조회 - GET /api/popups/{id}/wishlist-count).
export function getPopupWishlistCount(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<{ wishlistCount: number }>(`/api/popups/${popupId}/wishlist-count`),
    () => ({ wishlistCount: 0 })
  );
}

// 소비자 화면에 노출하지 않는 팝업 상태
export const HIDDEN_STATUSES = new Set(["PENDING", "REJECTED", "SUSPENDED"]);

// 인기 팝업 정보
export interface PopularPopup {
  popupId: number;
  title: string;
  companyName: string;
  wishlistCount: number;
  reviewCount: number;
  clickCount: number;
  totalScore: number;
}

// 인기 팝업 목록 조회
export function getPopularPopups(params?: { limit?: number; region?: string }) {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.region) query.set("region", params.region);
  const qs = query.toString();
  return apiFetch<PopularPopup[]>(`/api/popups/popular${qs ? `?${qs}` : ""}`);
}

// 조건별 팝업 검색
export function searchPopups(params?: { location?: string; status?: string; keyword?: string }) {
  const query = new URLSearchParams();
  if (params?.location) query.set("location", params.location);
  if (params?.status) query.set("status", params.status);
  if (params?.keyword) query.set("keyword", params.keyword);
  const qs = query.toString();
  return withMockFallback(
    () => apiFetch<PopupDetail[]>(`/api/popups${qs ? `?${qs}` : ""}`),
    () => mockSearchPopups(params)
  ).then((list) => list.filter((p) => !HIDDEN_STATUSES.has(p.status)));
}

// -------------------------- 예약 슬롯 --------------------------
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

// -------------------- 팝업 이미지 (popup_image 테이블) --------------------

export interface PopupImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
  type: "THUMBNAIL" | "DETAIL";
}

// 팝업 이미지 목록 조회
export function getPopupImages(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupImage[]>(`/api/popups/${popupId}/images`),
    () => [] as PopupImage[]
  );
}

// -------------------- 실시간 혼잡도 --------------------
//
// 최근 체크인/입장 기록 기반으로 계산된 현재 인원/정원/혼잡도(여유·보통·혼잡)

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

// -------------------- 예상 대기시간 --------------------
//
// SLOT 모드면 슬롯별 예상 대기시간 목록, FREE 모드면 통짜 예상 대기시간

export interface SlotWaitTime {
  slotId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  reservedCount: number;
  capacity: number;
  estimatedWaitMinutes: number;
}

export interface FreeModeWaitTime {
  popupId: number;
  date: string;
  reservedCount: number;
  capacity: number;
  estimatedWaitMinutes: number;
}

export interface PopupWaitTime {
  popupId: number;
  reservationMode: "SLOT" | "FREE";
  slots: SlotWaitTime[] | null;
  freeModeResult: FreeModeWaitTime | null;
}

export function getPopupWaitTime(popupId: string | number, date?: string) {
  const d = date ?? toLocalDateString(new Date());
  return apiFetch<PopupWaitTime>(`/api/popups/${popupId}/wait-time?date=${d}`);
}

// -------------------- 통합 대기열 현황판 --------------------
//
// 사전예약자+현장웨이팅자를 합친 통합 현황판

export function getQueueBoardCount(popupId: string | number) {
  return apiFetch<{ popupId: number; totalCount: number }>(`/api/popups/${popupId}/queue/board`);
}

// -------------------- 클릭 로그 --------------------
//
// [신규 연결] POST /api/popups/{id}/click — 상세페이지 진입 기록

export function logPopupClick(popupId: string | number, customerId?: number | null) {
  const qs = customerId != null ? `?customerId=${customerId}` : "";
  return apiFetch<void>(`/api/popups/${popupId}/click${qs}`, { method: "POST" }).catch((err) => {
    console.debug("[popup-click] 기록 실패 — 무시", err);
  });
}
