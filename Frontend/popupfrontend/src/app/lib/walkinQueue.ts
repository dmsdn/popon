// [역할] 대기열 운영보조 로컬저장 — 남은건 "운영방식"뿐 (나머진 [7/23]부터 서버 이관됨)
//  - 퇴장처리→POST /api/queue/exit/qr, 입장목록→통합보드 GET .../queue/board
//    (구 localStorage키 reservationExits:*·enteredWaitings:* 는 미사용)
//
// ⚠ 운영모드만 로컬유지 이유: 백엔드 Popup.queueMode는 응답엔 있지만 등록/수정 DTO가 아직 안 받음
//    → DTO에 queueMode 수신 추가되면 이 모듈 삭제 가능 [팀 전달사항]

export type OpsMode = "RESERVATION" | "WALKIN" | "BOTH";

// 로컬 시각 ISO (서버 LocalDateTime과 동일 포맷 — toISOString()은 UTC라 표시가 9시간 어긋남)
export function localNowIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function loadOpsMode(popupId: number | string): OpsMode {
  const v = localStorage.getItem(`waitingOpsMode:${popupId}`);
  return v === "RESERVATION" || v === "WALKIN" || v === "BOTH" ? v : "BOTH";
}

export function saveOpsMode(popupId: number | string, mode: OpsMode) {
  localStorage.setItem(`waitingOpsMode:${popupId}`, mode);
}
