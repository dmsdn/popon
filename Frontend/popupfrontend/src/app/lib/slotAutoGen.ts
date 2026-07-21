// 예약 슬롯 자동 생성 — 팝업 등록 정보 기준 (수동 슬롯 추가 폐지)
// 백엔드 일괄 생성 API(POST /api/popups/{id}/slots/generate, 멱등)로 위임:
// 서버가 운영기간 × 운영시간 ÷ 슬롯 단위로 없는 슬롯만 생성하고,
// 설정 변경으로 무효가 된 구 슬롯은 예약이 없으면 삭제(deletedStale)·있으면 유지(keptStale)한다.
// (기존에는 프론트가 기대 슬롯을 계산해 슬롯당 POST를 반복 호출했음 — jsw 백엔드 구현으로 교체)

import { Popup, PopupSlot, getSlots, generateSlots } from "./api";

export type EnsureSlotsResult = {
  created: number;
  keptStale: number; // 예약이 있어 유지된 구 슬롯 수 — 화면에서 경고 표시용
  existing: PopupSlot[];
};

// SLOT 모드 팝업의 슬롯을 서버에 일괄 생성 (주최자 본인만 호출할 것 — 생성 API가 소유자 검증)
export async function ensureSlots(popup: Popup, perSlotCapacity: number): Promise<EnsureSlotsResult> {
  if (popup.reservationMode !== "SLOT" || !popup.startDate || !popup.endDate || !popup.avgExperienceMinutes) {
    return { created: 0, keptStale: 0, existing: await getSlots(popup.id) };
  }
  const res = await generateSlots(popup.id, perSlotCapacity);
  return { created: res.created, keptStale: res.keptStale, existing: res.slots };
}
