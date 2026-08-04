// lib/utils/operatingHours.ts
// 요일별 운영시간(operatingHours) 배열에서 "오늘/특정 날짜가 휴무인지"를
// 판단하는 공용 헬퍼예요. ReservationModal(달력에서 휴무일 막기)과
// 팝업 상세페이지(오늘 웨이팅 막기)에서 같이 써요.

import type { PopupDetail } from "@/lib/api/popups";

export type OperatingHours = NonNullable<PopupDetail["operatingHours"]>;

// new Date().getDay() (0=일 ~ 6=토) 순서와 맞춘 dayOfWeek 키
export const DAY_OF_WEEK_ORDER = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export function getClosedWeekdays(hours?: OperatingHours | null): Set<string> {
  const set = new Set<string>();
  hours?.forEach((h) => {
    if (h.closed) set.add(h.dayOfWeek);
  });
  return set;
}

// 특정 날짜(Date)가 요일 기준 휴무일인지 판단해요.
// [주의] 지금 백엔드 operatingHours는 "매주 반복되는 요일별 휴무"만 표현해요.
// "8/15만 임시휴무" 같은 특정 날짜 단위 휴무는 이 필드로 표현이 안 돼서
// 여기선 못 막아요 - 아래 채팅 답변의 "백엔드 요청사항"을 참고해주세요.
export function isDateClosed(hours: OperatingHours | null | undefined, date: Date): boolean {
  const closedWeekdays = getClosedWeekdays(hours);
  if (closedWeekdays.size === 0) return false;
  const dayKey = DAY_OF_WEEK_ORDER[date.getDay()];
  return closedWeekdays.has(dayKey);
}

export function isTodayClosed(hours?: OperatingHours | null): boolean {
  return isDateClosed(hours, new Date());
}
