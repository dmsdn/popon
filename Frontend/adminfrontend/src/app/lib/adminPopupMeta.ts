// 관리자의 팝업 상태 변경·수정 이력 기록
// ※ 원래 관리자·주최자가 한 앱(5174)일 때 localStorage로 공유하던 데모 구현.
//   관리자 콘솔이 이 앱(5175)으로 분리되면서 여기서 쓴 메모(editNote)는 주최자센터(5174)에
//   더 이상 전달되지 않는다(다른 origin의 localStorage). 관리자 화면 안에서의 기록·표시는 그대로 동작.
//   관리자 수정 메모 쓰기 API가 백엔드에 생기면 이 모듈은 삭제하고 서버 값으로 대체할 것.

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

// 게시중지 판별.
// 7/27부터 백엔드에 전용 상태(SUSPENDED)가 생겨 그걸 우선 본다.
// 그 전 데이터는 반려 API 재사용 + 사유 앞 마커 방식이라(REJECTED + "[게시중지]") 폴백으로 남겨둔다.
export const SUSPEND_MARKER = "[게시중지]";
export const isSuspended = (status: string, rejectReason: string | null) =>
  status === "SUSPENDED" ||
  (status === "REJECTED" && (rejectReason ?? "").startsWith(SUSPEND_MARKER));
