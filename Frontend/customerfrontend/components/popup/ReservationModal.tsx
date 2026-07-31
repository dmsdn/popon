"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CountStepper } from "./CountStepper";
import type { PopupSlot } from "@/lib/api/popups";

interface ReservationModalProps {
  popupName: string;
  dateRange?: string;
  location?: string;
  onClose: () => void;
  onSubmit: (date: Date, count: number, slotId?: number, time?: string) => void;
  slots?: PopupSlot[];
  minDate: Date;
  maxDate: Date;
  capacity?: number;
  // [신규] 예약 생성과 일정 변경이 같은 모달을 재사용하는데, 버튼이 항상 "예약하기"라고만
  // 떠서 일정 변경 화면에서도 새로 예약하는 것처럼 보였어요. mode로 문구를 구분합니다.
  mode?: "create" | "change";
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_TIME_OPTIONS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDate(a: Date | null, b: Date): boolean {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthCells(year: number, month: number): (number | null)[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  return [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
}

export function ReservationModal({
  popupName,
  dateRange,
  location,
  onClose,
  onSubmit,
  slots = [],
  minDate,
  maxDate,
  capacity,
  mode = "create",
}: ReservationModalProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const earliestSelectable = useMemo(
    () => (startOfDay(minDate) > today ? startOfDay(minDate) : today),
    [minDate, today]
  );
  const latestSelectable = useMemo(() => startOfDay(maxDate), [maxDate]);

  const monthsToShow = useMemo(() => {
    const list: { year: number; month: number }[] = [];
    let y = earliestSelectable.getFullYear();
    let m = earliestSelectable.getMonth();
    for (let i = 0; i < 2; i++) {
      list.push({ year: y, month: m });
      if (y === latestSelectable.getFullYear() && m === latestSelectable.getMonth()) break;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return list;
  }, [earliestSelectable, latestSelectable]);

  const [monthIndex, setMonthIndex] = useState(0); // 지금 화면에 "포커스"된 달 (버튼 이동용)
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const monthSectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const goToMonth = (index: number) => {
    if (index < 0 || index >= monthsToShow.length) return;
    setMonthIndex(index);
    monthSectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [count, setCount] = useState(1);

  function isSelectable(year: number, month: number, day: number): boolean {
    const d = startOfDay(new Date(year, month, day));
    return d >= earliestSelectable && d <= latestSelectable;
  }

  const hasSlots = slots.length > 0;

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate || !hasSlots) return [];
    const key = toDateKey(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    return slots.filter((s) => s.slotDate === key);
  }, [slots, selectedDate, hasSlots]);

  useEffect(() => {
    setSelectedSlotId(null);
    setSelectedTime(null);
  }, [selectedDate]);

  const selectedSlot = slotsForSelectedDay.find((s) => s.id === selectedSlotId);
  const maxCount = hasSlots ? Math.max(1, selectedSlot?.remaining ?? 1) : Math.max(1, capacity ?? 10);

  useEffect(() => {
    if (count > maxCount) setCount(maxCount);
  }, [maxCount, count]);

  const canSubmit =
    selectedDate !== null && (hasSlots ? selectedSlotId !== null : selectedTime !== null);

  const dateLabel = selectedDate ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일` : "00월 00일";
  const timeLabel = hasSlots
    ? selectedSlot
      ? ` ${formatTime(selectedSlot.startTime)}`
      : ""
    : selectedTime
    ? ` ${selectedTime}`
    : "";
  const actionWord = mode === "change" ? "예약 변경하기" : "예약하기";
  const buttonLabel = canSubmit
    ? `${dateLabel}${timeLabel} ${count}인 ${actionWord}`
    : `00월 00일 0시 0인 ${actionWord}`;

  const handleSubmit = () => {
    if (!selectedDate) return;
    if (hasSlots && !selectedSlotId) return;
    if (!hasSlots && !selectedTime) return;
    onSubmit(selectedDate, count, selectedSlotId ?? undefined, selectedTime ?? undefined);
  };

  // 시간 선택 영역이 보이면(=날짜를 골랐으면) 모바일에서는 화면 전체를 써요.
  const expanded = selectedDate !== null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`w-full bg-white dark:bg-[#282B32] overflow-y-auto px-6 pt-6 pb-8 mobile:max-w-lg mobile:rounded-2xl mobile:max-h-[85vh] ${
          expanded ? "h-full rounded-none" : "rounded-t-2xl max-h-[85vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">{popupName}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        {/* [신규] 웨이팅 모달과 같은 팝업 정보 카드 */}
        {(dateRange || location) && (
          <div className="border border-gray-200 dark:border-[#282B32] rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-gray-400">
              {dateRange}
              {dateRange && location && " · "}
              {location}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">날짜</p>
          {monthsToShow.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goToMonth(monthIndex - 1)}
                disabled={monthIndex === 0}
                aria-label="이전 달"
                className="text-gray-400 disabled:opacity-20"
              >
                ‹
              </button>
              <span className="text-sm text-gray-500 w-14 text-center">
                {monthsToShow[monthIndex].year}.{String(monthsToShow[monthIndex].month + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => goToMonth(monthIndex + 1)}
                disabled={monthIndex === monthsToShow.length - 1}
                aria-label="다음 달"
                className="text-gray-400 disabled:opacity-20"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {/* 이번 달 아래로 스크롤(또는 위 버튼)로 다음 달까지 이어서 볼 수 있어요 */}
        <div ref={scrollBoxRef} className="max-h-[220px] overflow-y-auto mb-6 pr-1">
          <div className="grid grid-cols-7 gap-y-1 text-center mb-1">
            {WEEKDAYS.map((wd) => (
              <span key={wd} className="text-sm text-gray-400">{wd}</span>
            ))}
          </div>
          {monthsToShow.map(({ year, month }, mi) => (
            <div
              key={`${year}-${month}`}
              ref={(el) => {
                monthSectionRefs.current[mi] = el;
              }}
              className={mi > 0 ? "mt-3" : ""}
            >
              {mi > 0 && (
                <p className="text-sm font-medium text-gray-400 mb-1">
                  {year}.{String(month + 1).padStart(2, "0")}
                </p>
              )}
              <div className="grid grid-cols-7 gap-y-2 text-center">
                {buildMonthCells(year, month).map((day, i) => {
                  if (day === null) return <span key={`empty-${mi}-${i}`} />;

                  const cellDate = new Date(year, month, day);
                  const selectable = isSelectable(year, month, day);
                  const isToday = sameDate(today, cellDate);
                  const isSelected = sameDate(selectedDate, cellDate);
                  const isCurrentMonth = mi === 0;

                  let textClass = "text-gray-200";
                  if (selectable) {
                    textClass = isCurrentMonth ? "text-gray-900 dark:text-white font-semibold" : "text-gray-400 font-medium";
                  }
                  if (isToday && selectable && !isSelected) {
                    textClass = "text-orange-500 font-bold";
                  }

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!selectable}
                      onClick={() => setSelectedDate(cellDate)}
                      className={`w-7 h-7 mx-auto rounded-full text-sm flex items-center justify-center ${textClass} ${
                        isSelected ? "bg-gray-900 !text-white font-medium" : ""
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {selectedDate !== null && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">시간</p>
            {hasSlots ? (
              slotsForSelectedDay.length === 0 ? (
                <p className="text-sm text-gray-400">이 날짜엔 예약 가능한 시간대가 없어요.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slotsForSelectedDay.map((slot) => {
                    const isFull = slot.remaining <= 0;
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-lg py-2 text-sm border ${
                          isFull
                            ? "border-gray-100 dark:border-[#282B32] text-gray-300 line-through"
                            : isSelected
                            ? "bg-gray-900 text-white border-gray-900 font-medium"
                            : "border-gray-200 dark:border-[#282B32] text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {formatTime(slot.startTime)}
                        {isFull && <span className="block text-sm mt-0.5">마감</span>}
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_TIME_OPTIONS.map((time) => {
                  const isPast =
                    selectedDate.getTime() === today.getTime() &&
                    `${String(new Date().getHours()).padStart(2, "0")}:00` >= time;
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isPast}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-lg py-2 text-sm border ${
                        isPast
                          ? "border-gray-100 dark:border-[#282B32] text-gray-300 line-through"
                          : selectedTime === time
                          ? "bg-gray-900 text-white border-gray-900 font-medium"
                          : "border-gray-200 dark:border-[#282B32] text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            인원 <span className="text-sm text-gray-400 font-normal">(최대 {maxCount}명)</span>
          </span>
          <CountStepper value={count} onChange={setCount} max={maxCount} />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-100 text-gray-900 dark:text-white disabled:opacity-60 enabled:bg-gray-900 enabled:text-white"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
