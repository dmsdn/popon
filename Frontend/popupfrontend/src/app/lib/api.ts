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
      anon = crypto.randomUUID();
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
      if (res.status === 401 || res.status === 403) message = "로그인이 필요하거나 권한이 없습니다.";
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── 주최자(사업자) 인증 ──

export type LoginResponse = { accessToken: string; businessId: number; companyName: string };
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
}) {
  return request<unknown>("/api/business/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMyInfo() {
  return request<BusinessInfo>("/api/business/auth/me");
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
export type PopupStatusCode = "PENDING" | "REJECTED" | "BEFOR" | "OPEN" | "CLOSED";

export type Popup = {
  id: number;
  businessId: number;
  companyName: string;
  title: string;
  description: string;
  location: string | null;
  startDate: string | null; // ISO LocalDateTime
  endDate: string | null;
  status: PopupStatusCode;
  rejectReason: string | null;
  createdAt: string;
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
