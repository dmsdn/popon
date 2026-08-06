//components/popup/ReservationModal.tsx
// 사전예약 등록/일정변경 모달 - 달력 선택, 시간대(슬롯) 선택, 인원, 이용안내를 포함하는 큰 컴포넌트
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CountStepper } from "./CountStepper";
import type { PopupSlot } from "@/lib/api/popups";
import { RESERVATION_USAGE_GUIDE } from "@/lib/usageGuide";
import { useScrollLock } from "@/lib/useScrollLock";
import { appAlert } from "@/lib/ui/alertStore";
import { isDateClosed, type OperatingHours } from "@/lib/utils/operatingHours";

interface ReservationModalProps {
  popupName: string;
  dateRange?: string;
  location?: string;
  notice?: string | null;
  onClose: () => void;
  onSubmit: (date: Date, count: number, slotId?: number, time?: string) => void;
  slots?: PopupSlot[];
  minDate: Date;
  maxDate: Date;

  maxPartySizePerTeam?: number | null;
  // @deprecated maxPartySizePerTeam이 없을 때의 대체값으로만 남겨둠
  capacity?: number;
  // 예약 생성과 일정 변경이 같은 모달을 재사용 
  // > 버튼이 항상 "예약하기"라고만 떠서 일정 변경 화면에서도 새로 예약하는 것처럼 보이는 문제 
  // > mode로 문구를 구분
  mode?: "create" | "change";
  // 팝업 요일별 휴무일 - 달력에서 휴무 요일은 아예 선택 못 하게 막음 (사전예약을 휴무일로 넣어버리는 걸 원천 차단)
  operatingHours?: OperatingHours;
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
  notice,
  onClose,
  onSubmit,
  slots = [],
  minDate,
  maxDate,
  capacity,
  maxPartySizePerTeam,
  mode = "create",
  operatingHours,
}: ReservationModalProps) {
  // [수정] 단순 overflow:hidden만으로는 모바일 터치 스크롤이 새는 경우가 있어서, body를 고정하는 더 확실한 방식으로
  useScrollLock();

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

  // 스크롤 위치가 박스 절반을 넘어간 달로 자동 전환되도록 스크롤 이벤트
  const handleCalendarScroll = () => {
    const box = scrollBoxRef.current;
    if (!box) return;
    const boxRect = box.getBoundingClientRect();
    const midpointY = boxRect.top + boxRect.height / 2;
    let current = 0;
    monthSectionRefs.current.forEach((el, i) => {
      if (!el) return;
      if (el.getBoundingClientRect().top <= midpointY) current = i;
    });
    setMonthIndex(current);
  };

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [count, setCount] = useState(1);

  // 휴무 요일은 기간(minDate~maxDate) 안에 있어도 선택 못 하게
  function isClosedDay(year: number, month: number, day: number): boolean {
    return isDateClosed(operatingHours, new Date(year, month, day));
  }

  function isSelectable(year: number, month: number, day: number): boolean {
    const d = startOfDay(new Date(year, month, day));
    if (d < earliestSelectable || d > latestSelectable) return false;
    return !isClosedDay(year, month, day);
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

  // 오늘 날짜를 골랐을 때, 이미 지나간 시작 시각의 슬롯은 막음
  const isPastSlot = (slot: PopupSlot): boolean => {
    if (!selectedDate || selectedDate.getTime() !== today.getTime()) return false;
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
    return slot.startTime <= nowTime;
  };

  const perTeamCap = maxPartySizePerTeam ?? capacity ?? 10;
  const maxCount = hasSlots
    ? selectedSlot
      ? Math.max(1, Math.min(selectedSlot.remaining, perTeamCap))
      : Math.max(1, perTeamCap)
    : Math.max(1, perTeamCap);

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

  // 시간 선택 영역이 보이면(=날짜를 골랐으면) 모바일에서는 화면 전체
  const expanded = selectedDate !== null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`w-full flex flex-col bg-white dark:bg-[#282B32] mobile:max-w-lg mobile:rounded-2xl mobile:max-h-[85vh] ${
          expanded ? "h-full rounded-none" : "rounded-t-2xl max-h-[85vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 pt-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-lg font-bold">{popupName}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        {/* 웨이팅 모달과 같은 팝업 정보 카드 */}
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

        {/* 이번 달 아래로 스크롤(또는 위 버튼)로 다음 달까지 이어서 볼 수 있음 */}
        <div ref={scrollBoxRef} onScroll={handleCalendarScroll} className="max-h-[220px] overflow-y-auto scrollbar-hide mb-6 pr-1">
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
                  const closedDay = isClosedDay(year, month, day);
                  const isToday = sameDate(today, cellDate);
                  const isSelected = sameDate(selectedDate, cellDate);
                  const isCurrentMonth = mi === 0;

                  let textClass = "text-gray-200 dark:text-gray-700";
                  if (selectable) {
                    textClass = isCurrentMonth ? "text-gray-900 dark:text-white font-semibold" : "text-gray-400 font-medium";
                  }
                  if (isToday && selectable && !isSelected) {
                    textClass = "text-orange-500 font-bold";
                  }
                  // 휴무 요일은 기간 안이어도 흐리게 + 취소선으로 구분
                  if (closedDay) {
                    textClass = "text-gray-300 dark:text-gray-700 line-through";
                  }

                  return (
                    <div key={day} className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        disabled={!selectable}
                        onClick={() => setSelectedDate(cellDate)}
                        className={`w-7 h-7 mx-auto rounded-full text-sm flex items-center justify-center ${textClass} ${
                          isSelected ? "border border-point !text-[#218B09] font-semibold" : ""
                        }`}
                      >
                        {day}
                      </button>
                      {/* 행 높이 흔들림 방지 */}
                      <span
                        className={`text-[9px] leading-none ${
                          closedDay ? "text-gray-300 dark:text-gray-600" : "invisible"
                        }`}
                      >
                        휴무
                      </span>
                    </div>
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
                    const isPast = isPastSlot(slot);
                    const isSelected = selectedSlotId === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull || isPast}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`rounded-lg py-2 text-sm border ${
                          isFull || isPast
                            ? "border-gray-100 dark:border-[#282B32] text-gray-300 line-through"
                            : isSelected
                            ? "border-point text-point font-medium"
                            : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {formatTime(slot.startTime)}
                        {isFull && <span className="block text-sm mt-0.5">마감</span>}
                        {!isFull && isPast && <span className="block text-sm mt-0.5">마감</span>}
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
                          ? "border-point text-point font-medium"
                          : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
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
          <CountStepper
            value={count}
            onChange={setCount}
            max={maxCount}
            onExceedMax={(max) => appAlert(`이 팝업에 예약할 수 있는 최대 인원(${max}명)을 넘었어요.`)}
          />
        </div>

        {/* 인원 설정 아래에 예약 전용 이용 안내사항 */}
        <div className="mb-8">
          <p className="text-sm font-semibold mb-2">이용 안내사항</p>
          {notice ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{notice}</p>
          ) : (
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4 flex flex-col gap-1.5">
              {RESERVATION_USAGE_GUIDE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        </div>

        {/* 스크롤 영역 밖, 모달 하단에 항상 보이도록 고정한 예약하기 버튼 */}
        <div className="flex-none px-6 pt-3 pb-8 border-t border-gray-100 dark:border-[#17181a]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-100 dark:bg-[#17181a] text-gray-900 dark:text-white disabled:opacity-60 enabled:bg-point"
        >
          {buttonLabel}
        </button>
        </div>
      </div>
    </div>
  );
}
