"use client";

// 웨이팅 등록 모달 - 인원, 이용안내를 포함해요.

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
  /** [수정 8/5] 팀당 최대 인원(popup.maxPartySizePerTeam) - 웨이팅 인원
      스테퍼의 최대값으로 써요. capacity(공간 전체 동시 수용 인원)는 이
      값과 다른 개념이라 최대 인원 기준으로 쓰면 안 돼요 - 예: 공간 정원이
      100명이어도 한 팀은 4명까지만 웨이팅할 수 있는 경우가 있어요.
      maxPartySizePerTeam이 없는 팝업(옛 데이터)은 capacity로 대체하고,
      그것도 없으면 기본값(10명)을 써요. */
  maxPartySizePerTeam?: number | null;
  /** @deprecated 팀당 최대 인원 계산엔 더 이상 안 써요 - maxPartySizePerTeam이 없을 때의 대체값으로만 남겨둠. */
  capacity?: number;
  onClose: () => void;
  onSubmit: (count: number) => void;
}

/**
 * [수정] 대표 이미지가 비어있을 때 "이미지" 텍스트만 덩그러니 뜨는 게 어색해서,
 * 이미지 자체를 없애고 팝업 이름/기간/장소를 간단한 카드로 정리해서 보여줘요.
 * (예약 모달 ReservationModal 상단에도 똑같은 카드를 넣었어요)
 */
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
  // [수정 8/5] capacity(공간 전체 정원) 대신 maxPartySizePerTeam(팀당 최대 인원)을 우선 사용.
  const maxCount = Math.max(1, maxPartySizePerTeam ?? capacity ?? 10);

  // [수정] 단순 overflow:hidden만으로는 모바일 터치 스크롤이 새는 경우가 있어서,
  // body를 고정하는 더 확실한 방식으로 바꿨어요.
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
        {/* [수정] 웨이팅하기 버튼을 스크롤 영역 밖으로 빼서 모달 하단에 항상
            고정되도록 했어요 (예약 모달과 동일하게). */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-6 pt-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">웨이팅 등록</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="border border-gray-200 dark:border-[#282B32] rounded-lg px-4 py-3 mb-8">
          {/* [수정] 팝업 이름이 잘 안 보인다는 피드백 - text-sm → text-base로 키웠어요. */}
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

        {/* [신규] 인원 설정 아래에 웨이팅 전용 이용 안내사항을 넣었어요. */}
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
