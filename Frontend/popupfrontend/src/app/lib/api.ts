// 백엔드(Spring Boot) REST API 클라이언트
// 개발 환경에서는 vite.config.ts의 프록시가 /api, /uploads 요청을 :8080으로 전달한다.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = "accessToken";

// 비로그인 방문자를 구분하는 임의 id (7/31).
//
// 원래 crypto.randomUUID()를 그냥 불렀는데, 이 함수는 **보안 컨텍스트(HTTPS 또는 localhost)에서만
// 존재한다.** 평문 HTTP로 배포하는 순간 undefined가 되어 TypeError가 나고, logVisit()이 앱 최초
// 마운트에서 호출되기 때문에 렌더가 통째로 죽어 화면이 새까맣게 나왔다.
// 개발 중에는 localhost가 예외적으로 보안 컨텍스트라 아무도 눈치채지 못했다.
//
// 이 값은 방문자 추이 집계용 구분자일 뿐 보안에 쓰이지 않으므로, 없으면 난수로 대체한다.
// (HTTPS를 붙이면 위쪽 분기로 돌아간다 — 그때도 이 폴백은 그대로 두는 게 맞다)
function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── 플랫폼 방문 로그 (관리자 대시보드 방문자 추이 집계용) ──
// 앱 최초 마운트 시 1회만 호출한다. 집계용 fire-and-forget이라 실패는 무시(콘솔만).
// visitorKey: 관리자 "admin:{id}" / 주최자 "business:{id}" / 비로그인은 localStorage에 보관하는 UUID 재사용
export function logVisit() {
  let visitorKey = "";
  try {
    const raw = localStorage.getItem("authUser");
    const u = raw ? JSON.parse(raw) : null;
    if (u?.role === "admin" && u.adminId != null) {
      visitorKey = `admin:${u.adminId}`;
    } else if (u?.businessId != null) {
      // role 없는 구버전 저장분도 사업자 계정으로 간주 (AuthContext와 동일 규칙)
      visitorKey = `business:${u.businessId}`;
    }
  } catch {
    // 손상된 authUser는 비회원으로 처리
  }
  if (!visitorKey) {
    let anon = localStorage.getItem("visitor_id");
    if (!anon) {
      anon = randomId();
      localStorage.setItem("visitor_id", anon);
    }
    visitorKey = anon;
  }
  fetch("/api/visits/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ visitorKey, appSource: "POPUP" }),
  })
    .then((res) => {
      if (!res.ok) console.debug(`[visit-log] 응답 ${res.status} (백엔드 미구현이면 무시해도 됨)`);
    })
    .catch(() => console.debug("[visit-log] 전송 실패 — 무시"));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// 저장된 토큰이 로컬 기준으로 아직 유효(만료 전)한지 — 403 원인 판별용
function isTokenLocallyValid(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new ApiError(0, "서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.");
  }

  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      if (res.status === 401 || res.status === 403) {
        // 주의: 403+빈 본문은 두 경우가 있다.
        //  a) Security 필터가 토큰을 거부(만료·무효) — 진짜 세션 문제
        //  b) 백엔드 미처리 예외(FK 제약 위반 등)가 /error로 재디스패치됐는데 /error도 인증 필수라 403이 되는 스프링 함정
        //     (예: 예약 슬롯이 연결된 팝업 DELETE — 자식 데이터 미정리로 DataIntegrityViolation)
        // 로컬 토큰의 exp가 아직 유효하면 (b)로 판단해 로그아웃하지 않는다.
        if (isTokenLocallyValid()) {
          message = `요청을 처리하지 못했습니다. (${res.status}) 연결된 데이터(예약 슬롯·예약 등)가 있는 항목이거나 서버 오류일 수 있습니다.`;
        } else {
          message = "세션이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.";
          // 각 센터 레이아웃(SellerRoot/AdminRoot)이 수신해 자동 로그아웃·로그인 화면 이동 처리
          window.dispatchEvent(new CustomEvent("popupon:auth-expired"));
        }
      }
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── 주최자(사업자) 인증 ──

export type LoginResponse = {
  accessToken: string;
  businessId: number;
  companyName: string;
  needsReconsent: boolean; // 개인정보 동의 보관기간 만료 → 재동의 필요
};
export type BusinessInfo = {
  id: number; email: string; companyName: string; businessNumber: string; phone: string;
  profileImage: string | null; // 대표 브랜드 사진 URL (서버가 500×500 JPEG으로 변환해 저장)
};

export function login(email: string, password: string) {
  return request<LoginResponse>("/api/business/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signup(data: {
  email: string;
  password: string;
  companyName: string;
  businessNumber: string; // 000-00-00000
  phone?: string;
  agreeTerms: boolean; // 개인정보 수집·이용 동의 (백엔드 필수)
}) {
  return request<unknown>("/api/business/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateMyInfo(data: { companyName?: string; phone?: string }) {
  return request<BusinessInfo>("/api/business/auth/me", { method: "PUT", body: JSON.stringify(data) });
}

export function changeMyPassword(currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/api/business/auth/me/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getMyInfo() {
  return request<BusinessInfo>("/api/business/auth/me");
}

// 회원가입 2단계용 사업자번호 국세청 진위확인 미리보기 (7/29 연동 — jsw가 만든 check-business-number)
// 최종 가입 시 서버가 같은 로직으로 다시 검증하므로 이건 UX용 사전 확인이다.
// valid=false여도 400이 아니라 200으로 내려온다 — 프론트가 다음 단계 진행 여부를 결정.
export function checkBusinessNumber(businessNumber: string) {
  return request<{ valid: boolean; message: string }>(
    `/api/business/auth/check-business-number?businessNumber=${encodeURIComponent(businessNumber)}`,
  );
}

// 대표 브랜드 사진 등록·교체 (7/29 연동 — API는 jsw가 만들어뒀는데 프론트 래퍼가 없었다)
// 서버가 500×500 JPEG으로 리사이즈하므로 원본을 그대로 올린다. 응답은 갱신된 내 정보.
export function uploadBusinessProfileImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<BusinessInfo>("/api/business/auth/me/profile-image", { method: "POST", body: form });
}

// 개인정보 재동의 (로그인 응답 needsReconsent=true일 때 호출)
export function businessReconsent() {
  return request<{ message: string }>("/api/business/auth/consent", { method: "POST" });
}

// 약관 본문 조회 (permitAll)
export type Terms = { id: number; title: string; content: string; updatedAt: string };
export function getTerms() {
  return request<Terms>("/api/terms");
}

// ── 관리자 인증 ──
// ※ 7/28 정리: 관리자 UI가 adminfrontend(5175)로 분리되어 이 앱에서 사용처 없음 — 삭제 예정, 주석 보존.
/*
export type AdminLoginResponse = { accessToken: string; adminId: number; name: string };

export function adminLogin(email: string, password: string) {
  return request<AdminLoginResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
*/

// ── 팝업 ──

// PENDING(심사 대기) → BEFOR(승인·오픈예정) / REJECTED(반려) → OPEN → CLOSED
export type PopupStatusCode = "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED" | "SUSPENDED"; // SUSPENDED=게시중지 (7/27 백엔드 추가, 7/29 프론트 반영)

export type Popup = {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string | null; // ISO LocalDateTime — 시각 부분이 일일 운영 시작·종료 시간
  endDate: string | null;
  status: PopupStatusCode;
  rejectReason: string | null;
  createdAt: string;
  capacity: number | null; // 동시 수용 정원 — 등록 폼 필수 (서버는 capacity·areaSqm 둘 다 없으면 400)
  reservationMode: "SLOT" | "FREE" | null; // SLOT=슬롯 예약제, FREE=당일 방문(날짜 단위)
  avgExperienceMinutes: number | null; // 체험 소요시간(분) = 슬롯 단위
  // 7/23 jsw 추가분 — 7/24부터 등록/수정 DTO도 수신(필수) → 신규 팝업은 서버 값 사용, 구 팝업(null)만 로컬 OpsMode 폴백
  queueMode: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null; // 운영 방식
  statusChangedAt: string | null; // 관리자가 상태를 마지막으로 확정한 일시 (승인/반려/게시중지)
  adminEditNote: string | null;   // 반려·게시중지 사유 (승인 시 서버가 null로 초기화)
  hashtags: string[] | null;      // 7/27 jmy — 등록/수정 시 전송, 응답에 포함 (구 데이터는 null/[])
  keywordNames: string[] | null;  // 7/28 jmy — 표준 카테고리(keyword 테이블) 이름 목록. 상세 조회에서 채워짐
  regionName?: string | null;     // 7/29 — 지역(region) 이름 (백엔드 노출 확인됨)
  snsLinks?: { id: number; platform: string; url: string; displayName?: string | null; sortOrder?: number | null }[] | null; // 7/28 jmy
  thumbnailImages: string[] | null; // 7/28 jsw — 썸네일 이미지 URL 목록 (상세 조회에서만 채워짐)
  detailImages: string[] | null;    // 7/28 jsw — 상세 설명 이미지 URL 목록 (상세 조회에서만 채워짐)
  // 7/30 jsw — 요일별 운영시간·현장 웨이팅 팀당 최대 인원·유의사항·별점 집계
  operatingHours?: OperatingHoursItem[] | null;
  maxPartySizePerTeam?: number | null;
  notice?: string | null;          // 팝업 상세 유의사항
  avgRating?: number | null;       // 소비자 후기 평균 별점
  reviewCount?: number | null;
};

// ── SNS 링크 (7/28 jmy — 팝업과 함께 등록, 응답 snsLinks로 반환) ──

// 7/30 백엔드 SnsPlatform enum 개편 — FACEBOOK·TIKTOK 삭제, NAVERMAP 추가.
// 옛 코드를 보내면 서버가 enum 파싱에 실패해 400이 나므로 반드시 이 목록과 일치시킬 것.
export type SnsPlatformCode = "INSTAGRAM" | "YOUTUBE" | "X" | "BLOG" | "HOMEPAGE" | "NAVERMAP" | "ETC";
export type SnsLinkInput = { platform: SnsPlatformCode; url: string; displayName?: string; sortOrder?: number };

// ── 요일별 운영시간 (7/30 jsw — 등록/수정 요청의 operatingHours로 전송, 응답에도 동일 형태) ──

export type DayOfWeekCode = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type OperatingHoursItem = {
  dayOfWeek: DayOfWeekCode;
  openTime: string | null;  // "HH:mm[:ss]" — 휴무면 null
  closeTime: string | null;
  closed: boolean;
};

// ── 카테고리(keyword)·지역(region) 마스터 — 등록 폼 선택지용 (permitAll) ──

export type IdName = { id: number; name: string };

export function getKeywords() {
  return request<IdName[]>("/api/keywords");
}

export function getRegions() {
  return request<IdName[]>("/api/regions");
}

export function getPopups(params?: { location?: string; status?: string; keyword?: string }) {
  const qs = new URLSearchParams();
  if (params?.location) qs.set("location", params.location);
  if (params?.status) qs.set("status", params.status);
  if (params?.keyword) qs.set("keyword", params.keyword);
  const q = qs.toString();
  return request<Popup[]>(`/api/popups${q ? `?${q}` : ""}`);
}

export function getPopup(id: number | string) {
  return request<Popup>(`/api/popups/${id}`);
}

export function createPopup(data: {
  title: string;
  description: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number; // 사실상 필수 — areaSqm도 안 보내면 서버가 400 (PopupService.create)
  hashtags?: string[]; // 7/27 jmy — 검색 노출용 해시태그
  keywordIds?: number[]; // 7/29 — 표준 카테고리(keyword 테이블) ID 목록
  addressKeywordId?: number; // 7/29 — 지역(region 테이블) ID. 소비자 관심지역 필터 매칭용
  snsLinks?: SnsLinkInput[]; // 7/29 — SNS/홈페이지 링크 (홍보영상 칸 대체)
  reservationMode: "SLOT" | "FREE"; // 백엔드 필수
  avgExperienceMinutes: number; // 백엔드 필수 (슬롯 단위·분)
  queueMode: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH"; // 백엔드 필수 (7/24 jsw DTO 추가 — 미전송 시 400)
  operatingHours?: OperatingHoursItem[]; // 7/30 jsw — 요일별 운영시간 7개 (휴무는 closed=true)
  maxPartySizePerTeam?: number;          // 7/30 jsw — 현장 웨이팅 팀당 최대 인원 (미전송 = 제한 없음)
  notice?: string;                       // 유의사항 (소비자 상세 노출)
}) {
  return request<Popup>("/api/popups", { method: "POST", body: JSON.stringify(data) });
}

export function updatePopup(
  id: number | string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    status?: PopupStatusCode;
    capacity?: number;
    hashtags?: string[];
    keywordIds?: number[]; // 7/29 — 표준 카테고리 ID 목록 (미전송 시 기존 유지)
    addressKeywordId?: number; // 7/29 — 지역(region) ID
    snsLinks?: SnsLinkInput[]; // 7/29 — 미전송 시 기존 유지
    reservationMode?: "SLOT" | "FREE";
    avgExperienceMinutes?: number;
    queueMode?: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH"; // 수정 시 선택 (7/24 jsw DTO 추가)
    operatingHours?: OperatingHoursItem[]; // 7/30 jsw — 전송 시 전체 교체, 미전송 시 기존 유지
    maxPartySizePerTeam?: number;
    notice?: string;
  },
) {
  return request<Popup>(`/api/popups/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deletePopup(id: number | string) {
  return request<void>(`/api/popups/${id}`, { method: "DELETE" });
}

// 팝업 이미지 업로드 — 7/29부터 type 구분 (THUMBNAIL=목록·카드용 800×800 정사각, DETAIL=상세 본문용 1080×1440 세로형)
// 서버(ImageProcessingService)가 규격에 맞춰 리사이즈·크롭하므로 프론트는 원본을 그대로 보낸다.
export type PopupImageTypeCode = "THUMBNAIL" | "DETAIL";

export function uploadPopupImage(id: number | string, file: File, type: PopupImageTypeCode = "THUMBNAIL") {
  const form = new FormData();
  form.append("file", file);
  return request<{ id: number; imageUrl: string; type: string; sortOrder: number }>(
    `/api/popups/${id}/images?type=${type}`,
    { method: "POST", body: form },
  );
}

// 팝업 이미지 조회 — 인증 불필요 (type 생략 시 전체)
export type PopupImageItem = { id: number; imageUrl: string; type: PopupImageTypeCode; sortOrder: number };

// 팝업 이미지 삭제 — 수정 화면에서 기존 이미지를 빼거나 교체할 때 사용 (7/29)
export function deletePopupImage(popupId: number | string, imageId: number) {
  return request<void>(`/api/popups/${popupId}/images/${imageId}`, { method: "DELETE" });
}

export function getPopupImages(id: number | string, type?: PopupImageTypeCode) {
  return request<PopupImageItem[]>(`/api/popups/${id}/images${type ? `?type=${type}` : ""}`);
}

// 내(로그인한 사업자) 팝업 목록 — 심사 상태(PENDING/REJECTED) 포함
export function getMyPopups() {
  return request<Popup[]>("/api/popups/my");
}

// ── 팝업 심사 (관리자 전용) ──

export function approvePopup(id: number | string) {
  return request<Popup>(`/api/admin/popups/${id}/approve`, { method: "PUT" });
}

export function rejectPopup(id: number | string, reason: string) {
  return request<Popup>(`/api/admin/popups/${id}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

// ── 예약 슬롯 ──

export type PopupSlot = {
  id: number;
  popupId: number;
  slotDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm:ss
  endTime: string;
  capacity: number;
  reservedCount: number;
  remaining: number;
};

export function getSlots(popupId: number | string) {
  return request<PopupSlot[]>(`/api/popups/${popupId}/slots`);
}

export function createSlot(
  popupId: number | string,
  data: { slotDate: string; startTime: string; endTime: string; capacity: number },
) {
  return request<PopupSlot>(`/api/popups/${popupId}/slots`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// 슬롯 일괄 생성 — 팝업 등록 정보(운영기간·운영시간·슬롯 단위) 기준, 서버가 없는 것만 생성·구 슬롯 정리 (멱등)
export type SlotGenerateResult = {
  created: number;
  deletedStale: number; // 설정 변경으로 무효가 된 구 슬롯 중 삭제된 수(예약 없던 것)
  keptStale: number; // 예약이 있어 유지된 구 슬롯 수 — 화면에서 경고 표시
  slots: PopupSlot[];
};
export function generateSlots(popupId: number | string, perSlotCapacity?: number) {
  return request<SlotGenerateResult>(`/api/popups/${popupId}/slots/generate`, {
    method: "POST",
    body: JSON.stringify({ perSlotCapacity }),
  });
}

// ── 현장 웨이팅 (jsw waiting 도메인) ──

export type WaitingStatusCode = "WAITING" | "CALLED" | "ENTERED" | "CANCELLED";

export type WaitingItem = {
  id: number;
  popupId: number;
  customerId: number | null;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  partySize: number;
  teamNumber: number; // 당일 팝업별 대기번호
  qrToken: string; // 입장 QR 값
  status: WaitingStatusCode;
  teamsAhead: number;
  registeredAt: string;
  calledAt: string | null;
  callExpiresAt: string | null;
  enteredAt: string | null;
  source: "ONSITE_WAITING";
};

// 웨이팅 등록 (permitAll) — 회원은 customerId, 비회원은 name+email 필수
export function registerWaiting(
  popupId: number | string,
  data: { name?: string; email?: string; phoneNumber: string; partySize: number },
  customerId?: number,
) {
  const q = customerId ? `?customerId=${customerId}` : "";
  return request<WaitingItem>(`/api/popups/${popupId}/waiting${q}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getWaitingBoard(popupId: number | string) {
  return request<{ popupId: number; totalWaitingTeams: number; waitingList: WaitingItem[] }>(
    `/api/popups/${popupId}/waiting/board`,
  );
}

export function enterWaiting(id: number) {
  return request<WaitingItem>(`/api/waiting/${id}/enter`, { method: "PATCH" });
}

export function cancelWaiting(id: number) {
  return request<WaitingItem>(`/api/waiting/${id}/cancel`, { method: "PATCH" });
}

// ── 통합 대기열 (사전예약 + 현장 웨이팅) ──

export type UnifiedEntry = {
  source: "RESERVATION" | "ONSITE_WAITING";
  refId: number; // reservation.id 또는 waiting_queue.id
  displayName: string; // 마스킹된 이름
  phoneNumber: string | null;
  partySize: number;
  qrToken: string;
  entryStatus: string; // PENDING/CHECKED_IN/NO_SHOW(예약) · WAITING/ENTERED/CANCELLED(웨이팅)
  cancelReason?: string | null; // 웨이팅 취소 사유 (8/4) — 자정 리셋분은 "미입장"
  joinedAt: string; // 예약=슬롯 시작시각, 웨이팅=등록시각 (입장 후에는 둘 다 입장시각)
};

// 통합 대기열 보드 — 하루치 명단 (8/4).
// date를 주면 그날, 안 주면 오늘. 처리된 건(입장·노쇼·취소)도 함께 오므로 화면은 행을 지우는
// 대신 상태 배지를 붙인다 — 명단이 곧 그날의 기록지다.
export function getQueueBoard(popupId: number | string, date?: string) {
  return request<{ popupId: number; totalCount: number; entries: UnifiedEntry[] }>(
    `/api/popups/${popupId}/queue/board${date ? `?date=${date}` : ""}`,
  );
}

// 통합 QR 체크인 — 예약 QR·웨이팅 QR 구분 없이 하나로 처리 (서버가 시각 기록)
// 7/31 — popupId를 함께 보낸다.
// 그전에는 qrToken만 보냈고, 서버는 「이 QR이 내 팝업 것인가」까지만 확인했다
// (business email 비교). 그래서 **주최자가 같으면 지금 보고 있는 팝업이 아닌
// 다른 내 팝업의 QR도 입장 처리가 됐다.** 현장에서 팝업을 여러 개 운영하면
// 옆 매장 손님을 여기서 입장시켜 버리는 셈이라 명단이 어긋난다.
// popupId를 함께 보내 서버가 「지금 이 팝업의 QR인가」까지 검증하게 한다.
export function checkinUnifiedQr(qrToken: string, popupId: number | string) {
  return request<UnifiedEntry>("/api/queue/checkin/qr", {
    method: "POST",
    body: JSON.stringify({ qrToken, popupId }),
  });
}

// 통합 QR 퇴장 처리 (7/23 신규) — 예약·웨이팅 구분 없이 qrToken으로 퇴장 시각(exitedAt) 기록.
// 이 API로 관제의 체류 인원이 서버 기준으로 계산됨 (기존 localStorage 퇴장 기록 대체)
// 퇴장도 같은 이유로 popupId를 함께 보낸다 (7/31)
export function exitUnifiedQr(qrToken: string, popupId: number | string) {
  return request<UnifiedEntry>("/api/queue/exit/qr", {
    method: "POST",
    body: JSON.stringify({ qrToken, popupId }),
  });
}

// ── 계약 관리 (팝업 ↔ 파트너 공간 대관 계약) ──
// 계약금 등록·단계 전환은 관리자 권한, 주최자는 본인 팝업 조회만

export type ContractInfo = {
  popupId: number;
  popupTitle: string;
  contractAmount: number;
  memo: string | null;
  stage: "CONTRACTED" | "IN_CONSTRUCTION" | "OPERATING" | "SETTLED"; // OPERATING: 7/23 백엔드 enum 추가 — 로컬 플래그 대체
  registeredBy: string; // 등록/수정 관리자 (admin:이메일)
  createdAt: string;
  updatedAt: string;
};

export function getContract(popupId: number | string) {
  return request<ContractInfo>(`/api/popups/${popupId}/contract`);
}

// 관리자: 계약금 등록/수정 (최초 등록 시 단계는 CONTRACTED로 시작)
export function setAdminContract(popupId: number | string, data: { contractAmount: number; memo?: string }) {
  return request<ContractInfo>(`/api/admin/popups/${popupId}/contract`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function updateContractStage(popupId: number | string, stage: "IN_CONSTRUCTION" | "OPERATING" | "SETTLED") {
  return request<ContractInfo>(`/api/popups/${popupId}/contract/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

// ── 관리자 대시보드 (jsw 신규 API) ──

export type DailyVisitCount = { date: string; count: number };
export type RevenueTrend = { period: string; totalAmount: number };

export type AdminDashboard = {
  pendingPopupCount: number;
  openPopupCount: number;
  totalCustomerCount: number;
  activePartnerCount: number;
  pendingInquiryCount: number;
  pendingCsCount: number;
  pendingReportCount: number;
  visitTrend: DailyVisitCount[];
  revenueTrend: RevenueTrend[];
};

export function getAdminDashboard() {
  return request<AdminDashboard>("/api/admin/dashboard");
}

export function getVisitTrend(days = 7) {
  return request<DailyVisitCount[]>(`/api/admin/stats/visits?days=${days}`);
}

// ── CS(소비자 문의) · 주최자 문의 모더레이션 ──

export type CsItem = {
  id: number;
  customerId: number;
  customerNickname: string;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  answerContent: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
};

export type InquiryItem = {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  content: string;
  status: "PENDING" | "ANSWERED";
  answerContent: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
};

export function getAdminCsList(status?: "PENDING" | "ANSWERED") {
  return request<CsItem[]>(`/api/admin/cs${status ? `?status=${status}` : ""}`);
}
export function answerCs(id: number, answerContent: string) {
  return request<CsItem>(`/api/admin/cs/${id}/answer`, {
    method: "PATCH",
    body: JSON.stringify({ answerContent }),
  });
}
export function getAdminInquiries(status?: "PENDING" | "ANSWERED") {
  return request<InquiryItem[]>(`/api/admin/inquiries${status ? `?status=${status}` : ""}`);
}
export function answerInquiry(id: number, answerContent: string) {
  return request<InquiryItem>(`/api/admin/inquiries/${id}/answer`, {
    method: "PATCH",
    body: JSON.stringify({ answerContent }),
  });
}

// 주최자: 문의 작성·내 문의 목록
export function createInquiry(data: { title: string; content: string }) {
  return request<InquiryItem>("/api/inquiries", { method: "POST", body: JSON.stringify(data) });
}
export function getMyInquiries() {
  return request<InquiryItem[]>("/api/inquiries/my");
}

// ── 후기 신고 모더레이션 (popupbackend report 도메인) ──
// 접수는 소비자 프론트에서 POST /api/reports?customerId= 로 이뤄짐 (pew 담당)

export type ReportReasonCode = "ABUSE" | "SPAM" | "FALSE_INFO" | "OTHER";

export type ReportItem = {
  id: number;
  reviewId: number;
  reporterCustomerId: number;
  reporterNickname: string;
  reason: ReportReasonCode;
  detail: string | null;
  status: "PENDING" | "PROCESSED";
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
};

export function getAdminReports(status?: "PENDING" | "PROCESSED") {
  return request<ReportItem[]>(`/api/admin/reports${status ? `?status=${status}` : ""}`);
}
export function processReport(id: number) {
  return request<ReportItem>(`/api/admin/reports/${id}/process`, { method: "PATCH" });
}

// ── 공간(venue) 마스터 ──
// ※ 7/28 정리: 파트너 공간 기능이 7/24 멘토 피드백으로 프론트에서 삭제되어 사용처 없음.
//   백엔드 venue 도메인 정리(팀 합의) 시 이 블록도 함께 삭제할 것 — 그때까지 주석 보존.
/*
export type Venue = {
  id: number;
  name: string;
  address: string;
  areaSqm: number | null;
  rentalFee: number | null;
  description: string | null;
  imageUrl: string | null;
  status: "AVAILABLE" | "UNAVAILABLE";
  createdAt: string;
};

export function getVenues(status?: "AVAILABLE" | "UNAVAILABLE") {
  return request<Venue[]>(`/api/venues${status ? `?status=${status}` : ""}`);
}
export function createVenue(data: {
  name: string; address: string; areaSqm?: number; rentalFee?: number; description?: string; imageUrl?: string;
}) {
  return request<Venue>("/api/admin/venues", { method: "POST", body: JSON.stringify(data) });
}
export function updateVenue(id: number, data: Partial<Omit<Venue, "id" | "createdAt">>) {
  return request<Venue>(`/api/admin/venues/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteVenue(id: number) {
  return request<void>(`/api/admin/venues/${id}`, { method: "DELETE" });
}
*/

// ── 예약자 명단 (해당 팝업 주최자 또는 관리자) ──

export type ReservationDetail = {
  id: number;
  popupId: number;
  slotId: number | null; // FREE 모드면 null
  reservationDate: string;
  startTime: string | null;
  endTime: string | null;
  customerId: number;
  customerNickname: string;
  partySize: number;
  status: "CONFIRMED" | "CANCELLED";
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  entryStatus: string | null; // 입장 상태 (체크인/노쇼)
  checkedInAt: string | null;
  checkedInBy: string | null;
};

export function getPopupReservations(popupId: number | string) {
  return request<ReservationDetail[]>(`/api/reservations/popup/${popupId}`);
}

// 입장 처리 (주최자·관리자): 수동 체크인 / 노쇼
export function checkinReservation(id: number) {
  return request<ReservationDetail>(`/api/reservations/${id}/checkin`, { method: "PATCH" });
}
export function markNoShow(id: number) {
  return request<ReservationDetail>(`/api/reservations/${id}/no-show`, { method: "PATCH" });
}

// QR 스캔 입장 — 사전예약자의 입장 QR(qrToken)을 스캔해 체크인 (서버가 입장 시각 기록)
// popupId는 지금 화면에서 선택 중인 팝업 (7/31 추가). 없으면 서버가 「내 팝업인가」까지만 보므로
// 팝업을 여러 개 운영하는 주최자가 다른 팝업 손님의 QR도 찍을 수 있다.
export function checkinByQr(qrToken: string, popupId?: number | string) {
  return request<ReservationDetail>("/api/reservations/checkin/qr", {
    method: "POST",
    body: JSON.stringify(popupId == null ? { qrToken } : { qrToken, popupId }),
  });
}

// ── 내 팝업 성과 통계 (7/27 jmy — 방문자·예약 분석 6종, 본인 팝업만) ──

export type DailyCount = { date: string; visitorCount?: number; reservationCount?: number };
export type VisitorSummary = { totalVisitors: number; dailyAverage: number };
export type ConversionRate = { reservationCount: number; clickCount: number; conversionRate: number };

// 연령대별 방문자 — { "10대": 0, "20대": 3, ..., "미상": 1 }
export function getVisitorAgeStats(popupId: number | string) {
  return request<Record<string, number>>(`/api/popups/${popupId}/visitor-age-stats`);
}
// 성별 방문자 — { "남성": n, "여성": n, "미상": n }
export function getVisitorGenderStats(popupId: number | string) {
  return request<Record<string, number>>(`/api/popups/${popupId}/visitor-gender-stats`);
}
export function getVisitorTrend(popupId: number | string, days = 7) {
  return request<DailyCount[]>(`/api/popups/${popupId}/visitor-trend?days=${days}`);
}
export function getVisitorSummary(popupId: number | string) {
  return request<VisitorSummary>(`/api/popups/${popupId}/visitor-summary`);
}
export function getReservationTrend(popupId: number | string, days = 7) {
  return request<DailyCount[]>(`/api/popups/${popupId}/reservation-trend?days=${days}`);
}
export function getConversionRate(popupId: number | string) {
  return request<ConversionRate>(`/api/popups/${popupId}/conversion-rate`);
}

// ── 긴급공지 (내 팝업 → 소비자 발송) + 주최자 공지 수신함 ──

export type NoticeTarget = "ALL_RESERVED" | "TODAY_RESERVED" | "ONSITE_WAITING" | "WISHLIST";
export type NoticeItem = {
  id: number; popupId: number; category: string;
  title: string; content: string;
  recipientCount: number; sentBy: string; sentAt: string;
};

// 발송 — 서버가 수신자 집계 후 수신함(notice_recipient)에 적재. 제목은 「[긴급공지] 팝업명」 형식
export function sendPopupNotice(popupId: number | string, data: { targets: NoticeTarget[]; title: string; content: string }) {
  return request<NoticeItem>(`/api/popups/${popupId}/notices`, { method: "POST", body: JSON.stringify(data) });
}
export function getPopupNotices(popupId: number | string) {
  return request<NoticeItem[]>(`/api/popups/${popupId}/notices`);
}

// 주최자가 받은 공지(관리자 발송분) — 벨 알림 3번째 원천 + /seller/admin-notices 페이지
// 백엔드: NoticeBusinessController(/api/business/notices/my), DTO는 NoticeInboxResponse.
// category는 NoticeCategory enum 이름 — NOTICE(관리자·주최자 직접 발송) / WISHLIST / RESERVATION / WAITING.
export type NoticeCategoryCode = "NOTICE" | "WISHLIST" | "RESERVATION" | "WAITING";
export type NoticeInboxItem = {
  recipientId: number; noticeId: number; popupId: number | null; popupTitle: string | null;
  category: NoticeCategoryCode | string; title: string; content: string; sentAt: string; read: boolean;
};
// category를 넘기면 서버가 그 분류만 걸러서 준다 (getBusinessInbox의 두 번째 인자)
export function getMyNoticeInbox(category?: NoticeCategoryCode) {
  return request<NoticeInboxItem[]>(
    `/api/business/notices/my${category ? `?category=${category}` : ""}`,
  );
}
// ⚠ 7/30 수정 — 서버는 { unreadCount } 로 주는데 타입이 { count } 였다.
// 아직 쓰는 화면이 없어서 안 드러났던 불일치 (백엔드: Map.of("unreadCount", ...)).
export function getMyNoticeUnreadCount() {
  return request<{ unreadCount: number }>("/api/business/notices/my/unread-count");
}
export function markNoticeRead(recipientId: number) {
  return request<void>(`/api/business/notices/my/${recipientId}/read`, { method: "PATCH" });
}
