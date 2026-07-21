// 예약 슬롯 자동 생성 — 팝업 등록 정보 기준 (수동 슬롯 추가 폐지)
// 운영 기간(startDate~endDate 날짜)과 일일 운영시간(startDate·endDate의 시각 부분),
// 슬롯 단위(avgExperienceMinutes)로 기간 전체의 슬롯을 계산해, 서버에 없는 것만 생성한다.
// 예) 08-01~08-15 · 11:00~19:00 · 30분 단위 → 날짜별 11:00~11:30 … 18:30~19:00

import { Popup, PopupSlot, getSlots, createSlot } from "./api";

const MAX_AUTO_SLOTS = 400; // 폭주 방지 상한

const pad = (n: number) => String(n).padStart(2, "0");

export type SlotSpec = { slotDate: string; startTime: string; endTime: string };

// 팝업 정보에서 기대 슬롯 목록 계산 (SLOT 모드가 아니거나 정보 부족이면 빈 배열)
export function expectedSlots(popup: Popup): SlotSpec[] {
  if (popup.reservationMode !== "SLOT") return [];
  if (!popup.startDate || !popup.endDate || !popup.avgExperienceMinutes) return [];
  const unitMin = popup.avgExperienceMinutes;
  if (unitMin <= 0) return [];

  const startDay = popup.startDate.slice(0, 10);
  const endDay = popup.endDate.slice(0, 10);
  const openTime = popup.startDate.slice(11, 16) || "10:00"; // 일일 운영 시작
  const closeTime = popup.endDate.slice(11, 16) || "20:00"; // 일일 운영 종료

  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  if (closeMin <= openMin) return [];

  const specs: SlotSpec[] = [];
  const d = new Date(`${startDay}T00:00:00`);
  const last = new Date(`${endDay}T00:00:00`);
  while (d <= last && specs.length < MAX_AUTO_SLOTS) {
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    for (let m = openMin; m + unitMin <= closeMin && specs.length < MAX_AUTO_SLOTS; m += unitMin) {
      const e = m + unitMin;
      specs.push({
        slotDate: dateStr,
        startTime: `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`,
        endTime: `${pad(Math.floor(e / 60))}:${pad(e % 60)}:00`,
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return specs;
}

// 서버에 없는 슬롯만 생성 (주최자 본인만 호출할 것 — 생성 API가 소유자 검증)
export async function ensureSlots(
  popup: Popup,
  perSlotCapacity: number,
): Promise<{ created: number; failed: number; existing: PopupSlot[] }> {
  const specs = expectedSlots(popup);
  const existing = await getSlots(popup.id);
  if (specs.length === 0) return { created: 0, failed: 0, existing };

  const has = new Set(existing.map((s) => `${s.slotDate}|${s.startTime.slice(0, 5)}`));
  const missing = specs.filter((sp) => !has.has(`${sp.slotDate}|${sp.startTime.slice(0, 5)}`));

  let created = 0;
  let failed = 0;
  for (const sp of missing) {
    try {
      const slot = await createSlot(popup.id, { ...sp, capacity: perSlotCapacity });
      existing.push(slot);
      created++;
    } catch {
      failed++; // 개별 실패(중복 등)는 건너뜀
    }
  }
  existing.sort((a, b) => `${a.slotDate}${a.startTime}`.localeCompare(`${b.slotDate}${b.startTime}`));
  return { created, failed, existing };
}
