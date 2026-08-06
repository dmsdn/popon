// [역할] 계약진행 4단계 화면표현 매핑: 계약체결→제작/시공→운영중→철거/정산
// 전제(백엔드): 견적·디자인 확정 후 대관계약 체결시점부터 시작. 단계확인·전환은 관리자 권한
// (구 주최자 Quotes화면은 [7/24] 멘토피드백으로 삭제)
// [7/23] 백엔드 ContractStage에 OPERATING 추가로 4단계 전부 서버값화 (구 localStorage "운영중" 플래그 제거, 서버 단일소스)

export type ContractStage = "CONTRACTED" | "IN_CONSTRUCTION" | "OPERATING" | "SETTLED";

export const STAGE_FLOW: { key: ContractStage; label: string; desc: string }[] = [
  { key: "CONTRACTED", label: "계약체결", desc: "파트너 공간 대관 계약 완료 · 계약금 등록" },
  { key: "IN_CONSTRUCTION", label: "제작/시공", desc: "부스 제작·현장 설치 진행" },
  { key: "OPERATING", label: "운영 중", desc: "팝업 오픈·현장 운영" },
  { key: "SETTLED", label: "철거/정산", desc: "철거 완료·비용 정산" },
];

export function stageIndex(stage: ContractStage): number {
  return STAGE_FLOW.findIndex((s) => s.key === stage);
}

// 다음 단계 계산 (관리자 전환 버튼용) — 마지막 단계면 null
export function nextStage(current: ContractStage): ContractStage | null {
  const i = stageIndex(current);
  return i >= 0 && i < STAGE_FLOW.length - 1 ? STAGE_FLOW[i + 1].key : null;
}
