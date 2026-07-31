"use client";

import { useState, useEffect } from "react";
import { CountStepper } from "./CountStepper";

interface WaitingModalProps {
  popupName: string;
  dateRange?: string;
  location?: string;
  onClose: () => void;
  onSubmit: (count: number) => void;
}

/**
 * [수정] 대표 이미지가 비어있을 때 "이미지" 텍스트만 덩그러니 뜨는 게 어색해서,
 * 이미지 자체를 없애고 팝업 이름/기간/장소를 간단한 카드로 정리해서 보여줘요.
 * (예약 모달 ReservationModal 상단에도 똑같은 카드를 넣었어요)
 */
export function WaitingModal({ popupName, dateRange, location, onClose, onSubmit }: WaitingModalProps) {
  const [count, setCount] = useState(1);

  // [신규] 모달이 열려있는 동안 뒤에 있는 팝업 상세 화면이 스크롤되던 문제 -
  // body에 overflow: hidden을 걸어서 배경 스크롤을 막아요.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full mobile:max-w-md bg-white dark:bg-[#282B32] rounded-t-2xl mobile:rounded-2xl px-6 pt-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">웨이팅 등록</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="border border-gray-200 dark:border-[#282B32] rounded-lg px-4 py-3 mb-8">
          <p className="text-sm font-semibold mb-1">{popupName}</p>
          {(dateRange || location) && (
            <p className="text-sm text-gray-400">
              {dateRange}
              {dateRange && location && " · "}
              {location}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">인원</span>
          <CountStepper value={count} onChange={setCount} />
        </div>

        <button
          type="button"
          onClick={() => onSubmit(count)}
          className="w-full rounded-full py-3.5 text-base font-medium bg-gray-900 text-white"
        >
          웨이팅하기
        </button>
      </div>
    </div>
  );
}
