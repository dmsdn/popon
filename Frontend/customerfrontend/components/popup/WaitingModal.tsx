"use client";

import { useState } from "react";
import { CountStepper } from "./CountStepper";

interface WaitingModalProps {
  popupName: string;
  onClose: () => void;
  onSubmit: (count: number) => void;
}

export function WaitingModal({ popupName, onClose, onSubmit }: WaitingModalProps) {
  const [count, setCount] = useState(1);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end mobile:items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full mobile:max-w-md bg-white rounded-t-2xl mobile:rounded-2xl px-6 pt-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-base font-semibold">{popupName}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm mb-8">
          이미지
        </div>

        <div className="flex items-center justify-between mb-8">
          <span className="text-sm font-medium text-gray-700">인원</span>
          <CountStepper value={count} onChange={setCount} />
        </div>

        <button
  type="button"
  onClick={() => onSubmit(count)}
  className="w-full rounded-full py-3.5 text-sm font-medium bg-gray-900 text-white"
>
  웨이팅하기
</button>
      </div>
    </div>
  );
}