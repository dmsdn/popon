// lib/api/popups.ts
import { apiFetch, ApiError } from "./client";
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
  // [신규] "예약만"/"웨이팅만"/"둘 다" 중 이 팝업이 어떤 걸 지원하는지 - 웨이팅/예약
  // 버튼을 보여줄지 말지 판단하는 핵심 필드예요. (기존에 string | null로 있던 걸
  // 구체적인 유니온 타입으로 좁혔어요 - 중복 선언이라 에러가 났었어요.)
  queueMode: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null;
  maxPartySizePerTeam: number | null;
  // [신규] popup_hashtag 테이블 기반 실제 태그 목록. 백엔드에 진짜 카테고리 컬럼이
  // 없어서 지금까지 검색/홈 카테고리 필터가 팝업 이름 텍스트 매칭으로 흉내만 냈는데,
  // 이제 이걸로 정확하게 필터링할 수 있어요.
  hashtags: string[]; // 주최측이 직접 입력한 해시태그
  keywordNames: string[]; // [신규] 표준 카테고리 이름들 (예: ["패션", "라이프스타일"])
  // [신규] popup_sns_link 테이블 - PopupResponse에 직접 실려서 와요(별도 API 호출 불필요).
  snsLinks: SnsLink[];
  // [신규] 백엔드가 DB 전체 후기 기준으로 미리 계산해서 내려주는 평균 평점/후기 수.
  // 클라이언트에서 로드된 후기 목록만으로 평균을 내면 페이지네이션 때문에 부정확할 수
  // 있어서, 이제 이 값을 그대로 써요.
  avgRating: number | null;
  reviewCount: number;
  // [신규] 백엔드가 이제 팝업 응답 자체에 이미지 URL을 바로 실어줘요 - 목록 화면
  // (검색/홈 등)에서 카드마다 이미지를 따로 조회할 필요 없이 바로 쓸 수 있어요.
  thumbnailImages: string[];
  detailImages: string[];
  // [신규] 요일별 운영시간·휴무일 - 백엔드에 새로 생긴 필드예요.
  operatingHours?: {
    dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    openTime: string | null; // "HH:mm:ss" 형태
    closeTime: string | null;
    closed: boolean;
  }[];
  wishlistCount?: number; // [신규] 찜한 수 - 백엔드 필드명이 다르면 알려주세요
  // [신규] 소비자 상세페이지 "전화로 문의하기" 버튼용 - 백엔드가 상세조회
  // (findById → fromDetail)에서만 채워줘요. 목록 조회에는 절대 안 실려요.
  businessPhone?: string | null;
}

export interface SnsLink {
  id: number;
  platform: "INSTAGRAM" | "YOUTUBE" | "X" | "FACEBOOK" | "TIKTOK" | "BLOG" | "HOMEPAGE" | "ETC";
  url: string;
  displayName: string | null;
  sortOrder: number;
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
    // [수정] "백엔드가 아예 안 떠있음"(네트워크 실패/5xx)일 때만 mock으로 대체해요.
    // "존재하지 않는 팝업입니다" 같은 정상 404는 백엔드가 멀쩡히 응답한 진짜 결과라서,
    // mock으로 덮어버리면 안 되는(없는 걸 있는 것처럼 보여주는) 상황이었어요.
    const isConnectivityIssue = error instanceof ApiError && (error.isNetworkError || (error.status ?? 0) >= 500);
    if (process.env.NODE_ENV === "development" && isConnectivityIssue) {
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

// [신규] 찜 개수는 PopupResponse에 안 실려있고, 별도 엔드포인트로 따로
// 있었어요 (PopupController.getWishlistCount - GET /api/popups/{id}/wishlist-count).
export function getPopupWishlistCount(popupId: string | number) {
  return withMockFallback(
    () => apiFetch<{ wishlistCount: number }>(`/api/popups/${popupId}/wishlist-count`),
    // withMockFallback의 두 번째 인자는 () => T 예요. Promise를 넘기면 타입이 안 맞아요
    // (T가 {wishlistCount:number}인데 Promise<{...}>를 준 셈). 값을 그대로 돌려줘요. (7/31 수정)
    () => ({ wishlistCount: 0 })
  );
}

// [수정] 백엔드가 PENDING(승인대기)/REJECTED(반려)/SUSPENDED(게시중지) 상태 팝업도
// 목록에 그대로 섞어서 내려주고 있었어요. 이 상태들은 소비자 화면에 노출되면 안
// 돼요 — 여기서 미리 걸러냅니다. (SUSPENDED가 누락되어 있었어요 - "최근 본 팝업"에서
// 게시중지된 팝업이 계속 보이던 문제의 원인 중 하나였어요.)
export const HIDDEN_STATUSES = new Set(["PENDING", "REJECTED", "SUSPENDED"]);

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
// [신규 연결] 백엔드가 해시태그 겹침/지역 등을 기준으로 직접 점수를 매겨 계산해주는
// "비슷한 팝업" API가 있어요. 이전엔 프론트에서 직접 같은 방식으로 흉내내고
// 있었는데, 이제 백엔드 걸 그대로 써요 (인증 불필요, 공개 API).
// [수정] /api/popups/{id}/similar 엔드포인트가 실제로는 백엔드에 없어서 (전체
// 코드를 찾아봐도 "similar" 관련 코드가 전혀 없었어요) 항상 404가 나고 있었어요.
// 팝업 상세페이지는 다시 클라이언트에서 직접 계산하는 방식으로 되돌렸어요 -
// 이 함수는 더 이상 안 써서 지웠어요.

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

// -------------------- 클릭 로그 --------------------
//
// [신규 연결 7/31] POST /api/popups/{id}/click — 상세페이지 진입을 기록해요.
//
// 백엔드에 이 엔드포인트도, permitAll 설정도 처음부터 있었는데 **부르는 코드가 어디에도
// 없었어요.** 그래서 popup_click_log 테이블에 3건(수동 테스트분)만 쌓여 있었고,
// 이 값을 분모로 쓰는 주최자 성과 대시보드의 "예약 전환율"이 늘 이상하게 나왔어요
// (클릭 2·예약 4 → 200%). 컨트롤러·시큐리티·테이블·집계 쿼리·화면 카드가 다 있는데
// "그 주소를 부르는 한 줄"만 없던 거예요.
//
// 집계용이라 실패해도 사용자가 할 일이 없어요. 그래서 오류를 삼키고 화면에는 아무것도
// 알리지 않아요 - logVisit()과 같은 판단이에요.
// customerId는 선택이에요. 비회원 클릭도 인기순위 집계에 들어가야 하니까요.
export function logPopupClick(popupId: string | number, customerId?: number | null) {
  const qs = customerId != null ? `?customerId=${customerId}` : "";
  return apiFetch<void>(`/api/popups/${popupId}/click${qs}`, { method: "POST" }).catch((err) => {
    console.debug("[popup-click] 기록 실패 — 무시", err);
  });
}
