// 팝업 셀렉트 선택 기억 (8/5).
//
// 주최자센터는 화면마다 팝업 셀렉트가 있다 — 예약 명단, 대기열 관제, 성과, 공지.
// 그전에는 각자 「첫 팝업」이나 「진행중 첫 팝업」을 기본으로 골라서, 예약 명단에서
// 시즌오프를 보다가 관제로 넘어가면 다시 다른 팝업이 잡혀 매번 셀렉트를 다시 눌러야 했다.
// 마지막 선택을 localStorage에 기억해 화면을 오가도 같은 팝업이 잡혀 있게 한다.
//
// - 계정별로 저장하지 않는다: 이 브라우저의 주최자 세션은 한 계정이고, 남의 팝업 id가
//   남아 있어도 각 화면이 「내 목록에 있을 때만」 복원하므로(restoreSelectedPopup) 무해하다.
// - URL 쿼리(?popup=)로 명시 진입한 경우가 항상 우선이다 — 그건 「이 팝업을 보라」는
//   명령이고, 기억은 어디까지나 기본값이다.

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
