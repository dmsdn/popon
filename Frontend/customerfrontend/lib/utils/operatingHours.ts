// lib/utils/operatingHours.ts
// 팝업의 요일별 운영시간을 기준으로 특정 날짜의 휴무 여부를 판단하는 공용 유틸

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

// 특정 날짜(Date)가 요일 기준 휴무일인지 판단
export function isDateClosed(hours: OperatingHours | null | undefined, date: Date): boolean {
  const closedWeekdays = getClosedWeekdays(hours);
  if (closedWeekdays.size === 0) return false;
  const dayKey = DAY_OF_WEEK_ORDER[date.getDay()];
  return closedWeekdays.has(dayKey);
}

export function isTodayClosed(hours?: OperatingHours | null): boolean {
  return isDateClosed(hours, new Date());
}
