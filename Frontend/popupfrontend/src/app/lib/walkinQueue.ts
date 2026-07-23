// [역할] 대기열 운영 보조 저장 모듈 — 남은 것은 「운영 방식」 로컬 저장뿐.
//
// 7/23 백엔드 추가로 대부분 서버로 이관됨:
//  - 퇴장 처리      → POST /api/queue/exit/qr (lib/api.ts의 exitUnifiedQr)
//  - 입장 완료 목록 → 통합 보드(GET /api/popups/{id}/queue/board)가 체류중(CHECKED_IN/ENTERED)도 반환
//  (기존 localStorage 키 reservationExits:*, enteredWaitings:* 는 더 이상 사용하지 않음)
//
// ⚠ 운영 모드만 로컬 유지: 백엔드 Popup.queueMode·응답 노출은 생겼지만
//    등록/수정 요청 DTO(PopupCreateRequest·PopupUpdateRequest)가 아직 값을 받지 않아
//    저장 경로가 없음 → DTO에 queueMode 수신이 추가되면 이 모듈은 삭제 가능. (팀 전달 사항)

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
