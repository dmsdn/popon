// lib/api/popups.ts
import { apiFetch } from "./client";
import { toLocalDateString } from "@/lib/utils/formatLocalDate";
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
  // [신규] 백엔드가 popup.addressKeyword(Region FK, 성수/강남/홍대 등 동네 단위)를
  // 이제 응답에 실어줘요 - 이전엔 location 자유텍스트만 있어서 지역을 정확히 못 걸렀는데,
  // 이제 이 값으로 정확한 지역 필터링이 가능해요.
  regionId: number | null;
  regionName: string | null;
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
  queueMode: string | null;
  maxPartySizePerTeam: number | null;
  // [신규] popup_hashtag 테이블 기반 실제 태그 목록. 백엔드에 진짜 카테고리 컬럼이
  // 없어서 지금까지 검색/홈 카테고리 필터가 팝업 이름 텍스트 매칭으로 흉내만 냈는데,
  // 이제 이걸로 정확하게 필터링할 수 있어요.
  hashtags: string[];
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
      regionId: null,
      regionName: item.location ?? null,
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
      queueMode: null,
      maxPartySizePerTeam: null,
      hashtags: item.category ? [item.category] : [],
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

// [수정] 백엔드가 PENDING(승인대기)/REJECTED(반려) 상태 팝업도 목록에 그대로 섞어서
// 내려주고 있었어요. 그런데 이 두 상태는 아직 공개되면 안 되는 팝업이라, 소비자
// 화면에 노출되면 안 돼요 — toPopupItem이 이 둘을 전부 "예정"으로 매핑하다보니
// 승인도 안 된 팝업이 "곧 오픈"에 섞여 보였어요. 여기서 미리 걸러냅니다.
const HIDDEN_STATUSES = new Set(["PENDING", "REJECTED"]);

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

// -------------------- 팝업 이미지 (popup_image 테이블) --------------------
//
// [신규 연결] popup_image 엔티티/리포지토리는 있었지만 조회 API가 없어서 상세페이지가
// 항상 "대표 이미지"라는 고정 placeholder만 보여주고 있었어요. 백엔드에
// GET /api/popups/{popupId}/images를 추가했습니다.

export interface PopupImage {
  id: number;
  imageUrl: string;
  sortOrder: number;
}

export function getPopupImages(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<PopupImage[]>(`/api/popups/${popupId}/images`),
    () => [] as PopupImage[]
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

// -------------------- 예상 대기시간 --------------------
//
// [신규 연결] GET /api/popups/{popupId}/wait-time API가 있었는데 프론트에서 안 쓰고
// 있었어요. SLOT 모드면 슬롯별 예상 대기시간 목록을, FREE 모드면 통짜 예상 대기시간을 줘요.

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

// [수정] FREE 모드 팝업은 date 파라미터 없이 부르면 400 에러가 나요
// ("FREE 모드 팝업은 date 파라미터가 필요합니다"). 기본값으로 오늘 날짜를 넘겨요.
export function getPopupWaitTime(popupId: string | number, date?: string) {
  const d = date ?? toLocalDateString(new Date());
  return apiFetch<PopupWaitTime>(`/api/popups/${popupId}/wait-time?date=${d}`);
}

// -------------------- 통합 대기열 현황판 --------------------
//
// [신규 연결] GET /api/popups/{popupId}/queue/board — 사전예약자+현장웨이팅자를
// 합친 통합 현황판이에요.
//
// ⚠️ 보안 주의: 이 API가 로그인 없이 누구나 호출 가능(permitAll)한데, entries 배열에
// 다른 고객의 전화번호와 QR 토큰이 그대로 들어있어요. 그래서 여기선 일부러 totalCount만
// 타입에 노출하고 entries는 아예 안 받아와요 - 개인정보가 화면에 실수로라도 노출되는
// 걸 막기 위해서예요. 백엔드에 이 엔드포인트 접근 제한(직원/사업자 전용) 추가를
// 요청해야 해요.
export function getQueueBoardCount(popupId: string | number) {
  return apiFetch<{ popupId: number; totalCount: number }>(`/api/popups/${popupId}/queue/board`);
}
