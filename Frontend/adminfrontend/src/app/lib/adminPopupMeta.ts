export type AdminPopupMeta = {
  statusDate?: string; // 관리자가 상태를 마지막으로 확정(승인/반려/게시중지/수정)한 날짜 YYYY-MM-DD
  editNote?: string;   // 관리자 수정사항 및 사유 (주최자에게 표시)
  editDate?: string;   // 수정 완료 날짜 YYYY-MM-DD
};

const KEY = "adminPopupMeta";

export function loadAllMeta(): Record<string, AdminPopupMeta> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getMeta(popupId: number | string): AdminPopupMeta {
  return loadAllMeta()[String(popupId)] ?? {};
}

export function setMeta(popupId: number | string, patch: AdminPopupMeta) {
  const all = loadAllMeta();
  all[String(popupId)] = { ...all[String(popupId)], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const SUSPEND_MARKER = "[게시중지]";
export const isSuspended = (status: string, rejectReason: string | null) =>
  status === "SUSPENDED" ||
  (status === "REJECTED" && (rejectReason ?? "").startsWith(SUSPEND_MARKER));
