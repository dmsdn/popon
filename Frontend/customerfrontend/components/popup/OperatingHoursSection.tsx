// components/popup/OperatingHoursSection.tsx
"use client";

import { useState } from "react";
import type { PopupDetail } from "@/lib/api/popups";

const DAY_LABEL: Record<string, string> = {
  MONDAY: "월",
  TUESDAY: "화",
  WEDNESDAY: "수",
  THURSDAY: "목",
  FRIDAY: "금",
  SATURDAY: "토",
  SUNDAY: "일",
};

// new Date().getDay() (0=일 ~ 6=토) → 백엔드 dayOfWeek 키 순서
const DAY_ORDER = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

type Hour = NonNullable<PopupDetail["operatingHours"]>[number];

function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  const period = h < 12 ? "오전" : "오후";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${period} ${String(h12).padStart(2, "0")}:${mStr}`;
}

function formatRange(h: Hour): string {
  if (h.closed) return "휴무";
  return `${formatTime(h.openTime)} ~ ${formatTime(h.closeTime)}`;
}

// 시:분:초 문자열을 "지금 이 시각이 범위 안에 있는지" 비교용 분 단위 숫자로
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function OperatingHoursSection({ hours }: { hours: PopupDetail["operatingHours"] }) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || hours.length === 0) return null;

  const todayKey = DAY_ORDER[new Date().getDay()];
  const today = hours.find((h) => h.dayOfWeek === todayKey);

  // 모든 요일이 완전히 동일한 운영시간인지 (전부 휴무 or 전부 같은 시간)
  const allSame = hours.every((h) => h.closed === hours[0].closed && h.openTime === hours[0].openTime && h.closeTime === hours[0].closeTime);

  // "운영중"인지 - 오늘이 휴무가 아니고, 지금 시각이 오픈~마감 사이인지
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOpenNow =
    !!today && !today.closed && today.openTime && today.closeTime
      ? nowMinutes >= toMinutes(today.openTime) && nowMinutes <= toMinutes(today.closeTime)
      : false;

  const orderedHours = DAY_ORDER.slice(1).concat(DAY_ORDER[0]).map((key) => hours.find((h) => h.dayOfWeek === key)).filter((h): h is Hour => !!h); // 월~일 순서로 정렬

  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">운영시간 안내</h2>

      {allSame ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          월~일 {formatRange(hours[0])}
        </p>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
          >
            {today && (
              <span className={today.closed ? "text-gray-400" : "text-point font-medium"}>
                {today.closed ? "오늘 휴무" : isOpenNow ? "운영중" : "운영 종료"}
              </span>
            )}
            {today && (
              <span>
                {DAY_LABEL[todayKey]} {formatRange(today)}
              </span>
            )}
            <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
              <img src="/icons/ui/chevron_down.svg" alt="" width={14} height={14} className="dark:invert" />
            </span>
          </button>

          {expanded && (
            <div className="flex flex-col gap-1.5 mt-3 pl-1">
              {orderedHours.map((h) => (
                <div
                  key={h.dayOfWeek}
                  className={`flex items-center gap-3 text-sm ${
                    h.dayOfWeek === todayKey ? "text-gray-900 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <span className="w-4">{DAY_LABEL[h.dayOfWeek]}</span>
                  <span>{formatRange(h)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
