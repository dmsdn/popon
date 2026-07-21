// 계약 진행 4단계: 계약체결 → 제작/시공 → 운영 중 → 철거/정산
// 전제(백엔드 jsw): 견적·디자인 확정 후 파트너 공간과 주최자의 대관 계약이 체결된 시점부터 시작.
// 단계 확인·전환은 플랫폼 관리자의 권한/의무 — 주최자 화면은 조회 전용.
//
// ⚠ 백엔드 ContractStage는 3단계(CONTRACTED/IN_CONSTRUCTION/SETTLED)뿐이라 「운영 중」이 없음.
//    운영 중 전환은 localStorage 플래그로 기록(관리자↔주최자 같은 origin이라 공유됨)하고,
//    백엔드 enum에 OPERATING이 추가되면 이 모듈의 플래그 로직만 서버 값으로 교체하면 됨. (팀 전달 사항)

export type ServerStage = "CONTRACTED" | "IN_CONSTRUCTION" | "SETTLED";
export type UiStage = "CONTRACTED" | "IN_CONSTRUCTION" | "OPERATING" | "SETTLED";

export const STAGE_FLOW: { key: UiStage; label: string; desc: string }[] = [
  { key: "CONTRACTED", label: "계약체결", desc: "파트너 공간 대관 계약 완료 · 계약금 등록" },
  { key: "IN_CONSTRUCTION", label: "제작/시공", desc: "부스 제작·현장 설치 진행" },
  { key: "OPERATING", label: "운영 중", desc: "팝업 오픈·현장 운영" },
  { key: "SETTLED", label: "철거/정산", desc: "철거 완료·비용 정산" },
];

const OPERATING_KEY = "contractOperating"; // { [popupId]: "전환일 ISO" }

function loadOperatingMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(OPERATING_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function isOperating(popupId: number | string): boolean {
  return Boolean(loadOperatingMap()[String(popupId)]);
}

export function setOperating(popupId: number | string, on: boolean) {
  const map = loadOperatingMap();
  if (on) map[String(popupId)] = new Date().toISOString().slice(0, 10);
  else delete map[String(popupId)];
  localStorage.setItem(OPERATING_KEY, JSON.stringify(map));
}

// 서버 단계 + 운영중 플래그 → 화면 단계
export function toUiStage(server: ServerStage, popupId: number | string): UiStage {
  if (server === "IN_CONSTRUCTION" && isOperating(popupId)) return "OPERATING";
  return server;
}

export function stageIndex(stage: UiStage): number {
  return STAGE_FLOW.findIndex((s) => s.key === stage);
}

// 다음 단계 계산 (관리자 전환 버튼용) — 마지막 단계면 null
export function nextStage(current: UiStage): UiStage | null {
  const i = stageIndex(current);
  return i >= 0 && i < STAGE_FLOW.length - 1 ? STAGE_FLOW[i + 1].key : null;
}
