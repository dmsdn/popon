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

// ── 예약자 명단 (해당 팝업 주최자 또는 관리자) ──

export type ReservationDetail = {
  id: number;
  slotId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  customerId: number;
  customerNickname: string;
  partySize: number;
  createdAt: string;
};

export function getPopupReservations(popupId: number | string) {
  return request<ReservationDetail[]>(`/api/reservations/popup/${popupId}`);
}
