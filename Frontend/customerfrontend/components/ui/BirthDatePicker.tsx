"use client";

// 생년월일을 년/월/일 드럼(휠)으로 고르는 피커.

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function buildMonthCells(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  return [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * [신규] 브라우저 기본 <input type="date"> 팝업은 OS/브라우저마다 생김새가 달라서
 * 앱이랑 안 어울려 보였어요. 앱 디자인(원형 선택 표시, 회색/검정 톤)에 맞춘
 * 커스텀 달력 팝업으로 대체했어요. 생년월일은 넓은 연도 범위를 훑어야 해서
 * 연도/월을 드롭다운으로 바로 점프할 수 있게 했습니다.
 */
export function BirthDatePicker({
  value,
  onChange,
  onClose,
  title = "생년월일 선택",
}: {
  value: string; // "YYYY-MM-DD" 또는 빈 문자열
  onChange: (value: string) => void;
  onClose: () => void;
  title?: string; // 다른 날짜 선택(예: 후기의 "다녀간 날짜")에도 재사용할 수 있게
}) {
  const today = useMemo(() => new Date(), []);
  const initial = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = today.getFullYear(); y >= today.getFullYear() - 100; y--) list.push(y);
    return list;
  }, [today]);

  const cells = buildMonthCells(viewYear, viewMonth);
  const selectedIso = value || null;

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full mobile:max-w-sm bg-white dark:bg-[#282B32] rounded-t-2xl mobile:rounded-2xl px-5 pt-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">{title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-500 text-lg">
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="flex-1 bg-gray-100 dark:bg-[#17181a] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="flex-1 bg-gray-100 dark:bg-[#17181a] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i).map((m) => (
              <option key={m} value={m}>
                {m + 1}월
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={goPrevMonth} aria-label="이전 달" className="text-gray-400 px-2">
            ‹
          </button>
          <p className="text-sm font-medium">
            {viewYear}년 {viewMonth + 1}월
          </p>
          <button type="button" onClick={goNextMonth} aria-label="다음 달" className="text-gray-400 px-2">
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-sm text-gray-400 mb-1">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (day === null) return <span key={`empty-${i}`} />;
            const iso = toIsoDate(viewYear, viewMonth, day);
            const isFuture = new Date(iso) > today;
            const isSelected = iso === selectedIso;
            return (
              <button
                key={iso}
                type="button"
                disabled={isFuture}
                onClick={() => {
                  onChange(iso);
                  onClose();
                }}
                className={`w-8 h-8 mx-auto rounded-full text-sm flex items-center justify-center ${
                  isFuture
                    ? "text-gray-200"
                    : isSelected
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
