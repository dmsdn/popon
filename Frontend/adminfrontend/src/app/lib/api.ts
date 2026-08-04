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
export type BusinessInfo = { id: number; email: string; companyName: string; businessNumber: string; phone: string };

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

export function getMyInfo() {
  return request<BusinessInfo>("/api/business/auth/me");
}

// 개인정보 재동의 (로그인 응답 needsReconsent=true일 때 호출)
export function businessReconsent() {
  return request<{ message: string }>("/api/business/auth/consent", { method: "POST" });
}

// 약관 본문 조회 (permitAll)
// 팝업 이벤트 로그 (7/29 연동) — 예약·웨이팅의 상태 변화가 자동 기록된다
// (예: RESERVATION/ENTERED, WAITING/CALLED, 자동취소·자동퇴장 스케줄러 기록 포함)
export type EventLogItem = {
  id: number;
  entityType: string; // "RESERVATION" | "WAITING"
  entityId: number;
  eventType: string;  // "ENTERED" | "CALLED" | "CANCELLED" ...
  actor: string;      // "system" 또는 처리 주체
  memo: string | null;
  createdAt: string;
};
export function getPopupEventLog(popupId: number | string) {
  return request<EventLogItem[]>(`/api/admin/popups/${popupId}/event-log`);
}

export type Terms = { id: number; title: string; content: string; updatedAt: string };
// 약관 수정 (7/29 연동) — 소비자·주최자 회원가입의 "약관 보기"가 여기서 고친 본문을 그대로 보여준다
export function updateTerms(title: string, content: string) {
  return request<Terms>("/api/admin/terms", { method: "PUT", body: JSON.stringify({ title, content }) });
}
export function getTerms() {
  return request<Terms>("/api/terms");
}

// ── 관리자 인증 ──

export type AdminLoginResponse = { accessToken: string; adminId: number; name: string };

export function adminLogin(email: string, password: string) {
  return request<AdminLoginResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

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
  capacity: number | null; // 동시 수용 정원
  reservationMode: "SLOT" | "FREE" | null; // SLOT=슬롯 예약제, FREE=당일 방문(날짜 단위)
  avgExperienceMinutes: number | null; // 체험 소요시간(분) = 슬롯 단위
  // 7/23 jsw 추가분 — 로컬(localStorage) 임시 저장을 서버 값으로 대체
  queueMode: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null; // 운영 방식 (⚠ 등록/수정 요청 DTO에는 아직 미수신 — 값이 채워지면 로컬 OpsMode 대체)
  statusChangedAt: string | null; // 관리자가 상태를 마지막으로 확정한 일시 (승인/반려/게시중지)
  adminEditNote: string | null;   // 반려·게시중지 사유 (승인 시 서버가 null로 초기화)
  keywordNames: string[] | null;  // 7/28 jmy — 표준 카테고리 이름 목록 (상세 조회에서 채워짐)
  regionName?: string | null;     // 7/29 — 지역(region) 이름 (백엔드 노출 확인됨)
  thumbnailImages: string[] | null; // 7/28 jsw — 썸네일 이미지 URL (상세 조회에서만)
  detailImages: string[] | null;    // 7/28 jsw — 상세 설명 이미지 URL (상세 조회에서만)
  // 7/30 jsw — 요일별 운영시간·SNS 링크·해시태그·유의사항·별점 집계 (상세 조회에서 채워짐)
  operatingHours?: { dayOfWeek: string; openTime: string | null; closeTime: string | null; closed: boolean }[] | null;
  snsLinks?: { id: number; platform: string; url: string; displayName?: string | null; sortOrder?: number | null }[] | null;
  hashtags?: string[] | null;
  maxPartySizePerTeam?: number | null;
  notice?: string | null;
  avgRating?: number | null;
  reviewCount?: number | null;
};

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
  capacity?: number;
  reservationMode: "SLOT" | "FREE"; // 백엔드 필수
  avgExperienceMinutes: number; // 백엔드 필수 (슬롯 단위·분)
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
    reservationMode?: "SLOT" | "FREE";
    avgExperienceMinutes?: number;
  },
) {
  return request<Popup>(`/api/popups/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function deletePopup(id: number | string) {
  return request<void>(`/api/popups/${id}`, { method: "DELETE" });
}

export function uploadPopupImage(id: number | string, file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<{ imageUrl: string }>(`/api/popups/${id}/images`, { method: "POST", body: form });
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

// 게시중지 · 게시재개 (7/31 연동).
// 그전에는 전용 API가 없다고 보고 reject를 재사용하면서 사유 앞에 [게시중지] 마커를 붙였는데,
// 그러면 DB에 status=REJECTED로 저장돼 **게시중지한 팝업이 「반려」 필터에 뜨고 「게시중지」 필터는 늘 비었다.**
// 백엔드에는 7/27부터 전용 API가 있었다 — status를 SUSPENDED로 바로 바꾼다.
// suspend는 BEFOR·OPEN에서만 허용되고, resume은 날짜를 보고 원래 있어야 할 상태로 되돌린다.
export function suspendPopup(id: number | string, reason: string) {
  return request<Popup>(`/api/admin/popups/${id}/suspend`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}

export function resumePopup(id: number | string) {
  return request<Popup>(`/api/admin/popups/${id}/resume`, { method: "PUT" });
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
  entryStatus: string; // PENDING/CHECKED_IN/NO_SHOW(예약) · WAITING/CALLED/ENTERED/CANCELLED(웨이팅)
  joinedAt: string; // 예약=슬롯 시작시각, 웨이팅=등록시각
};

// 통합 대기열 보드 — 슬롯 시작이 지난 사전예약자 + 대기중 웨이팅 (서버가 자동 편입·정렬)
export function getQueueBoard(popupId: number | string) {
  return request<{ popupId: number; totalCount: number; entries: UnifiedEntry[] }>(
    `/api/popups/${popupId}/queue/board`,
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

// 7/30 jsw 신고 대개편 — 처리 방식이 「일괄 처리완료」에서 두 갈래로 나뉘었다.
//   반려(reject): 신고가 부적절 — 후기는 그대로 둔다
//   후기 가리기(hide-review): 신고 수용 — 후기 내용을 마스킹하고 작성자에게 알림 발송
// 응답에는 신고 대상 후기의 맥락(본문·별점·작성자·가림 여부)이 함께 실려 목록에서 바로 판단할 수 있다.
export type ReportStatusCode = "PENDING" | "REJECTED" | "HIDDEN";

export type ReportItem = {
  id: number;
  reviewId: number;
  reporterCustomerId: number;
  reporterNickname: string;
  reason: ReportReasonCode;
  detail: string | null;
  status: ReportStatusCode;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  // 신고 대상 후기 맥락
  reviewPopupId: number | null;
  reviewRating: number | null;
  reviewContent: string | null;
  reviewAuthorCustomerId: number | null;
  reviewHidden: boolean;
};

export function getAdminReports(status?: ReportStatusCode) {
  return request<ReportItem[]>(`/api/admin/reports${status ? `?status=${status}` : ""}`);
}
// 신고 반려 — 후기 유지
export function rejectReport(id: number) {
  return request<ReportItem>(`/api/admin/reports/${id}/reject`, { method: "PATCH" });
}
// 신고 수용 — 후기 마스킹 (작성자에게 알림 발송)
export function hideReportedReview(id: number) {
  return request<ReportItem>(`/api/admin/reports/${id}/hide-review`, { method: "PATCH" });
}

// ── 지역 마스터 (popup.address_keyword가 참조하는 region 테이블 — jmy 도메인, permitAll) ──

export type Region = { id: number; name: string };
export function getRegions() {
  return request<Region[]>("/api/regions");
}

// 카테고리(keyword 테이블) 마스터 — 팝업 목록 카테고리 필터용 (7/29, permitAll)
export function getKeywords() {
  return request<Region[]>("/api/keywords"); // 응답 형태 동일 {id, name}
}

// ── 마스터 관리 (관리자 전용) ──
// 7/27 jmy가 AdminKeywordController·AdminRegionController를 만들어뒀는데 프론트 연결이 없어
// 마스터 화면이 목업으로 남아 있었다. 7/29 연동.
// ⚠ 수정(PUT)은 백엔드에 없다 — 이름을 바꾸려면 삭제 후 재등록해야 하고, 그러면 그 항목을
//   고른 소비자의 관심 설정이 함께 지워진다. 화면에서 이 점을 안내한다.
export type MasterItem = { id: number; name: string; customerCount: number };

export function getAdminKeywords() {
  return request<MasterItem[]>("/api/admin/keywords");
}
export function createAdminKeyword(name: string) {
  return request<Region>("/api/admin/keywords", { method: "POST", body: JSON.stringify({ name }) });
}
export function deleteAdminKeyword(id: number) {
  return request<{ success: boolean }>(`/api/admin/keywords/${id}`, { method: "DELETE" });
}

export function getAdminRegions() {
  return request<MasterItem[]>("/api/admin/regions");
}
export function createAdminRegion(name: string) {
  return request<Region>("/api/admin/regions", { method: "POST", body: JSON.stringify({ name }) });
}
export function deleteAdminRegion(id: number) {
  return request<{ success: boolean }>(`/api/admin/regions/${id}`, { method: "DELETE" });
}

// ── 계정 관리 (7/29 jmy AdminAccountController — 관리자/주최자/소비자 목록 + 소비자 정지) ──

export type AdminAccount = { id: number; email: string; name: string; createdAt: string };
export function getAdminAccounts() {
  return request<AdminAccount[]>("/api/admin/admins");
}

export type BusinessAccount = {
  id: number; email: string; companyName: string; businessNumber: string;
  phone: string | null; profileImage: string | null; createdAt: string;
};
export function getBusinessAccounts() {
  return request<BusinessAccount[]>("/api/admin/businesses");
}

export type CustomerAccount = {
  id: number; email: string | null; nickname: string | null; provider: string | null;
  createdAt: string; withdrawn: boolean | null; suspended: boolean | null;
};
export function getCustomerAccounts() {
  return request<CustomerAccount[]>("/api/admin/customers");
}
export function suspendCustomer(id: number) {
  return request<{ success: boolean }>(`/api/admin/customers/${id}/suspend`, { method: "PATCH" });
}
export function resumeCustomer(id: number) {
  return request<{ success: boolean }>(`/api/admin/customers/${id}/resume`, { method: "PATCH" });
}

// ── 관리자 → 주최자 공지 발송 (7/29 jsw AdminNoticeController — 주최자 수신함으로 전달) ──

export type AdminNoticeResult = {
  id: number; popupId: number | null; category: string | null; title: string; content: string;
  recipientCount: number; sentBy: string; sentAt: string;
};
export function sendNoticeToBusiness(data: { businessId: number; popupId?: number; title: string; content: string }) {
  return request<AdminNoticeResult>("/api/admin/notices/business", { method: "POST", body: JSON.stringify(data) });
}

// ── 공간(venue) 마스터 ──
// ※ 7/28 정리: 공간(대관처) 마스터 화면이 지역 마스터로 교체(7/24)되어 사용처 없음.
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

// ── 배너 관리 (소비자 홈 상단 배너 — 7/28 실연동) ──

export type Banner = {
  id: number; title: string; imageUrl: string; linkUrl: string | null;
  sortOrder: number; startDate: string | null; endDate: string | null; active: boolean;
  popupId?: number | null; // 8/4 — 팝업 연동 배너면 그 팝업 id, 외부 URL 배너면 null
};
export function getAdminBanners() {
  return request<Banner[]>("/api/admin/banners");
}

// ── 팝업 연동 배너 (jsw 8/4 신설) ──
// 관리자가 승인된 팝업을 고르면 이미지·링크를 서버가 팝업에서 직접 가져와 배너를 만든다.
// 이미지를 다시 업로드할 필요가 없고, 링크 형식(customer-base-url + /popup/{id})도 서버가 단일 관리한다.
export type EligiblePopup = {
  id: number;
  title: string;
  status: "OPEN" | "BEFOR";
  thumbnailImageUrl: string | null; // null이면 썸네일이 없는 팝업 — 배너로 만들 수 없다
};
export function getBannerEligiblePopups() {
  return request<EligiblePopup[]>("/api/admin/banners/eligible-popups");
}
export function createBannerFromPopup(popupId: number, title: string, sortOrder?: number) {
  return request<Banner>("/api/admin/banners/from-popup", {
    method: "POST",
    body: JSON.stringify({ popupId, title, sortOrder }),
  });
}
// 7/29 — 배너 등록·수정은 JSON이 아니라 multipart/form-data다.
// 백엔드(BannerController)는 @RequestParam("file") MultipartFile을 받고 imageUrl은 서버가 만들어 돌려준다.
// 이전에는 프론트가 {imageUrl:"..."} JSON을 보내고 있어서 아예 동작하지 않았다.
// 서버가 1080×1440 JPEG으로 리사이즈하므로 프론트는 원본을 그대로 올린다.
export type BannerFields = {
  title?: string; linkUrl?: string; sortOrder?: number;
  startDate?: string; endDate?: string; active?: boolean;
};

function bannerForm(fields: BannerFields, file?: File | null): FormData {
  const form = new FormData();
  if (file) form.append("file", file);
  // 빈 문자열을 보내면 서버가 "값이 있다"고 보고 기존 값을 덮어쓰므로, 값이 있는 것만 담는다.
  // active:false는 이 검사를 통과한다 (false !== "") — 노출 토글이 꺼지지 않는 사고를 막는 부분.
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null && v !== "") form.append(k, String(v));
  }
  return form;
}

export function createBanner(file: File, fields: BannerFields) {
  return request<Banner>("/api/admin/banners", { method: "POST", body: bannerForm(fields, file) });
}

export function updateBanner(id: number, fields: BannerFields, file?: File | null) {
  return request<Banner>(`/api/admin/banners/${id}`, { method: "PUT", body: bannerForm(fields, file) });
}
export function deleteBanner(id: number) {
  return request<void>(`/api/admin/banners/${id}`, { method: "DELETE" });
}

// ── 공지 배너 (소비자 홈 공지줄 — 7/27 jsw 신설 announcement 도메인) ──

export type Announcement = { id: number; title: string; content: string | null; createdAt: string };
export function getAdminAnnouncements() {
  return request<Announcement[]>("/api/admin/announcements");
}
export function createAnnouncement(data: { title: string; content?: string }) {
  return request<Announcement>("/api/admin/announcements", { method: "POST", body: JSON.stringify(data) });
}
export function deleteAnnouncement(id: number) {
  return request<void>(`/api/admin/announcements/${id}`, { method: "DELETE" });
}

// ── 플랫폼 통계 실데이터 (PlatformStats — 7/28 연동) ──

// 팝업별 방문자(체크인) 랭킹 — date 생략 시 누적, 지정 시 해당 일자
export type PopupVisitorRanking = { rank: number; popupId: number; popupTitle: string; companyName: string; visitorCount: number };
export function getPopupRanking(date?: string) {
  return request<PopupVisitorRanking[]>(`/api/admin/stats/popup-ranking${date ? `?date=${date}` : ""}`);
}

// 매출(계약금) 추이 — unit: DAILY(최근 amount일) | MONTHLY(최근 amount개월)
export function getRevenueTrend(unit: "DAILY" | "MONTHLY" = "DAILY", amount = 30) {
  return request<RevenueTrend[]>(`/api/admin/stats/revenue?unit=${unit}&amount=${amount}`);
}
