// 관리자의 팝업 상태 변경·수정 이력 기록
// ※ 원래 관리자·주최자가 한 앱(5174)일 때 localStorage로 공유하던 데모 구현.
//   관리자 콘솔이 adminfrontend(5175)로 분리되면서 origin이 갈라져, 관리자가 쓴 메모(editNote)는
//   이 앱에서 더 이상 보이지 않는다(읽어도 빈 값 — 화면은 가드가 있어 조용히 생략됨).
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

// 게시중지는 관리자 반려 API를 재사용하되, 사유 앞에 마커를 붙여 일반 반려와 구분한다
export const SUSPEND_MARKER = "[게시중지]";
export const isSuspended = (status: string, rejectReason: string | null) =>
  status === "REJECTED" && (rejectReason ?? "").startsWith(SUSPEND_MARKER);
