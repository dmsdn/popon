// components/popup/WaitingModal.tsx
// 웨이팅 등록 모달 - 인원, 이용안내를 포함
"use client";

import { useState } from "react";
import { CountStepper } from "./CountStepper";
import { WAITING_USAGE_GUIDE } from "@/lib/usageGuide";
import { useScrollLock } from "@/lib/useScrollLock";
import { appAlert } from "@/lib/ui/alertStore";

interface WaitingModalProps {
  popupName: string;
  dateRange?: string;
  location?: string;
  notice?: string | null;
  maxPartySizePerTeam?: number | null;
  capacity?: number;
  onClose: () => void;
  onSubmit: (count: number) => void;
}

export function WaitingModal({
  popupName,
  dateRange,
  location,
  notice,
  maxPartySizePerTeam,
  capacity,
  onClose,
  onSubmit,
}: WaitingModalProps) {
  const [count, setCount] = useState(1);
  const maxCount = Math.max(1, maxPartySizePerTeam ?? capacity ?? 10);

  useScrollLock();

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full mobile:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-[#282B32] rounded-t-2xl mobile:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 pt-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">웨이팅 등록</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="border border-gray-200 dark:border-[#282B32] rounded-lg px-4 py-3 mb-8">
          <p className="text-base font-bold mb-1">{popupName}</p>
          {(dateRange || location) && (
            <p className="text-sm text-gray-400">
              {dateRange}
              {dateRange && location && " · "}
              {location}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            인원 <span className="text-sm text-gray-400 font-normal">(최대 {maxCount}명)</span>
          </span>
          <CountStepper
            value={count}
            onChange={setCount}
            max={maxCount}
            onExceedMax={(max) => appAlert(`이 팝업에 웨이팅 등록할 수 있는 최대 인원(${max}명)을 넘었어요.`)}
          />
        </div>

        <div className="mb-8">
          <p className="text-sm font-semibold mb-2">이용 안내사항</p>
          {notice ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{notice}</p>
          ) : (
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4 flex flex-col gap-1.5">
              {WAITING_USAGE_GUIDE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        </div>

        <div className="flex-none px-6 pt-3 pb-8 border-t border-gray-100 dark:border-[#17181a]">
        <button
          type="button"
          onClick={() => onSubmit(count)}
          className="w-full rounded-full py-3.5 text-base font-medium bg-point text-gray-900 dark:text-white"
        >
          웨이팅하기
        </button>
        </div>
      </div>
    </div>
  );
}
