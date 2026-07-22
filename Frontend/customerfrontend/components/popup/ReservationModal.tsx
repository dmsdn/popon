// components/popup/ReservationModal.tsx
"use client";

import { useMemo, useState } from "react";
import { CountStepper } from "./CountStepper";
import type { ReservationMode } from "@/lib/constants/status";
import type { PopupSlot } from "@/lib/api/popups";

interface ReservationModalProps {
  popupName: string;
  reservationMode: ReservationMode; // "SLOT" | "FREE"
  slots?: PopupSlot[]; // SLOT 모드일 때만 사용
  onClose: () => void;
  onSubmit: (date: Date, count: number, slotId?: number) => void;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ReservationModal({
  popupName,
  reservationMode,
  slots = [],
  onClose,
  onSubmit,
}: ReservationModalProps) {
  const today = useMemo(() => new Date(), []);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [count, setCount] = useState(1);

  const isSlotMode = reservationMode === "SLOT";

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  const canSubmit = isSlotMode ? selectedSlotId !== null : selectedDay !== null;

  const buttonLabel = isSlotMode
    ? selectedSlot
      ? `${selectedSlot.slotDate} ${selectedSlot.startTime.slice(0, 5)} ${count}인 예약하기`
      : "시간대를 선택해주세요"
    : canSubmit
    ? `${month + 1}월 ${selectedDay}일 ${count}인 예약하기`
    : "00월 00일 0인 예약하기";

  const handleSubmit = () => {
    if (isSlotMode) {
      if (!selectedSlot) return;
      onSubmit(new Date(selectedSlot.slotDate), count, selectedSlot.id);
      return;
    }
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

        {isSlotMode ? (
          <>
            <p className="text-sm font-medium text-gray-700 mb-3">시간대 선택</p>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center border border-gray-100 rounded-xl mb-8">
                예약 가능한 시간대가 없어요.
              </p>
            ) : (
              <div className="flex flex-col gap-2 mb-8">
                {slots.map((slot) => {
                  const isFull = slot.remaining <= 0;
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isFull}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`text-left border rounded-lg px-4 py-3 disabled:opacity-40 ${
                        isSelected ? "border-gray-900 bg-gray-50" : "border-gray-200"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {slot.slotDate} {slot.startTime.slice(0, 5)} ~ {slot.endTime.slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isFull ? "마감" : `잔여 ${slot.remaining}자리`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
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