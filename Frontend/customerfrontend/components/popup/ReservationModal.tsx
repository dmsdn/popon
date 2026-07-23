"use client";

import { useEffect, useMemo, useState } from "react";
import { CountStepper } from "./CountStepper";
import type { PopupSlot } from "@/lib/api/popups";

interface ReservationModalProps {
  popupName: string;
  onClose: () => void;
  onSubmit: (date: Date, count: number, slotId?: number) => void;
  // 주최측이 등록한 시간대 목록. SLOT 예약 방식 팝업일 때만 넘겨주세요.
  // (안 넘기거나 빈 배열이면 기존처럼 날짜+인원만 있는 화면으로 동작해요)
  slots?: PopupSlot[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

export function ReservationModal({ popupName, onClose, onSubmit, slots = [] }: ReservationModalProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [count, setCount] = useState(1);

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const slotsForSelectedDay = useMemo(() => {
    if (selectedDay === null) return [];
    const key = toDateKey(year, month, selectedDay);
    return slots.filter((s) => s.slotDate === key);
  }, [slots, selectedDay, year, month]);

  const hasSlots = slots.length > 0;

  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedDay]);

  const canSubmit = selectedDay !== null && (!hasSlots || selectedSlotId !== null);
  const buttonLabel = canSubmit
    ? `${month + 1}월 ${selectedDay}일 ${count}인 예약하기`
    : "00월 00일 0인 예약하기";

  const handleSubmit = () => {
    if (!selectedDay) return;
    if (hasSlots && !selectedSlotId) return;
    onSubmit(new Date(year, month, selectedDay), count, selectedSlotId ?? undefined);
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

        {hasSlots && selectedDay !== null && (
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">시간대</p>
            {slotsForSelectedDay.length === 0 ? (
              <p className="text-sm text-gray-400">이 날짜엔 예약 가능한 시간대가 없어요.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slotsForSelectedDay.map((slot) => {
                  const isFull = slot.remaining <= 0;
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`rounded-lg py-2.5 text-sm border ${
                        isFull
                          ? "border-gray-100 text-gray-300 line-through"
                          : isSelected
                          ? "bg-gray-900 text-white border-gray-900 font-medium"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      {formatTime(slot.startTime)}
                      {isFull && <span className="block text-[10px] mt-0.5">마감</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

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