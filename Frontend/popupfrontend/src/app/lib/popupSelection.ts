// [8/5] 팝업 셀렉트 선택 기억 — 화면마다(예약명단·관제·성과·공지) 팝업 셀렉트가 따로 있어
// 전엔 화면 이동시마다 다시 선택해야 했음 → 마지막 선택을 localStorage에 저장해 화면 이동해도 유지
//
// - 계정별 저장 안 함(각 화면이 "내 목록에 있을 때만" 복원하므로 무해 — restoreSelectedPopup)
// - URL 쿼리(?popup=) 명시진입이 항상 우선, 기억은 기본값일 뿐

const KEY = "seller:selectedPopupId";

export function saveSelectedPopup(id: number | null) {
  try {
    if (id == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(id));
  } catch {
    // 저장 불가(프라이빗 모드 등)여도 화면 동작에는 지장 없다
  }
}

export function loadSelectedPopup(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * 저장된 선택이 지금 목록에 있으면 그 id, 없으면 fallback.
 * 팝업이 삭제됐거나 다른 계정으로 로그인한 경우가 「없으면」에 해당한다.
 */
export function restoreSelectedPopup<T extends { id: number }>(
  list: T[],
  fallback: number | null,
): number | null {
  const saved = loadSelectedPopup();
  if (saved != null && list.some((p) => p.id === saved)) return saved;
  return fallback;
}
