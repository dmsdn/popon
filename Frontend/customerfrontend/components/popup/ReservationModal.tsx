"use client";

import { useMemo, useState } from "react";
import { CountStepper } from "./CountStepper";

interface ReservationModalProps {
  popupName: string;
  onClose: () => void;
  onSubmit: (date: Date, count: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ReservationModal({ popupName, onClose, onSubmit }: ReservationModalProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [count, setCount] = useState(1);

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const canSubmit = selectedDay !== null;
  const buttonLabel = canSubmit
    ? `${month + 1}월 ${selectedDay}일 ${count}인 예약하기`
    : "00월 00일 0인 예약하기";

  const handleSubmit = () => {
    if (!selectedDay) return;
    onSubmit(new Date(year, month, selectedDay), count);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full mobile:max-w-md bg-white rounded-t-2xl mobile:rounded-2xl px-6 pt-6 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">{popupName}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <p className="text-sm font-medium text-gray-700 mb-3">날짜</p>
        <div className="grid grid-cols-7 gap-y-3 mb-8 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-xs text-gray-400">{day}</span>
          ))}
          {cells.map((day, i) =>
            day === null ? (
              <span key={`empty-${i}`} />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`w-8 h-8 mx-auto rounded-full text-sm flex items-center justify-center ${
                  selectedDay === day ? "bg-gray-900 text-white font-medium" : "text-gray-700"
                }`}
              >
                {day}
              </button>
            )
          )}
        </div>

        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-medium text-gray-700">인원</span>
          <CountStepper value={count} onChange={setCount} />
        </div>

        <button
  type="button"
  onClick={handleSubmit}
  disabled={!canSubmit}
  className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-60 enabled:bg-gray-900 enabled:text-white"
>
  {buttonLabel}
</button>
      </div>
    </div>
  );
}