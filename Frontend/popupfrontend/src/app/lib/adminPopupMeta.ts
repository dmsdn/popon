// 관리자의 팝업 상태변경·수정이력 기록
// [분리 이후 무효화] 원래 관리자·주최자 한 앱(5174)일 때 localStorage 공유하던 데모구현 —
// adminfrontend(5175) 분리로 origin 갈라져 관리자 메모(editNote) 안 보임(빈값, 화면가드로 조용히 생략) → 백엔드에 메모 쓰기 API 생기면 이 모듈 삭제하고 서버값 대체

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

// 게시중지 판별 — [7/27부터] 전용상태(SUSPENDED) 우선 확인
// 그전 데이터는 반려API 재사용+사유앞마커 방식(REJECTED+"[게시중지]")이라 폴백으로 유지
export const SUSPEND_MARKER = "[게시중지]";
export const isSuspended = (status: string, rejectReason: string | null) =>
  status === "SUSPENDED" ||
  (status === "REJECTED" && (rejectReason ?? "").startsWith(SUSPEND_MARKER));
