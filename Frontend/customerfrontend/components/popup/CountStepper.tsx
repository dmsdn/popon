"use client";

// 인원수 +/- 조절 스테퍼 (예약/웨이팅 모달에서 사용).

import { useState } from "react";

interface CountStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  // [신규] 숫자를 눌러서 직접 입력했는데 최대 인원을 넘긴 경우 호출돼요.
  // 부모 컴포넌트가 안내 메시지를 띄울 수 있게 max값을 그대로 넘겨줘요.
  onExceedMax?: (max: number) => void;
}

export function CountStepper({ value, onChange, min = 1, max = 10, onExceedMax }: CountStepperProps) {
  // [신규] 숫자(가운데) 부분을 누르면 +/- 버튼 대신 직접 타이핑해서 원하는
  // 인원수를 바로 입력할 수 있어요. 최대 인원을 넘는 값을 입력하면 최대값으로
  // 되돌리고, onExceedMax로 부모에게 알려서 안내 메시지를 띄울 수 있게 해요.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commitDraft = () => {
    setEditing(false);
    const parsed = parseInt(draft, 10);
    if (isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    if (parsed > max) {
      onExceedMax?.(max);
      onChange(max);
      setDraft(String(max));
      return;
    }
    if (parsed < min) {
      onChange(min);
      setDraft(String(min));
      return;
    }
    onChange(parsed);
    setDraft(String(parsed));
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="인원 줄이기"
        className="w-8 h-8 rounded-full border border-gray-300 dark:border-[#282B32] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30 transition-transform active:scale-90 active:bg-gray-100 dark:active:bg-[#282B32] active:border-gray-400 dark:active:border-gray-500"
      >
        −
      </button>
      {editing ? (
        <input
          type="number"
          inputMode="numeric"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          className="text-sm font-medium w-10 text-center bg-transparent border-b border-gray-400 dark:border-gray-500 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          aria-label="인원수 직접 입력"
          className="text-sm font-medium w-10 text-center"
        >
          {value}
        </button>
      )}
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="인원 늘리기"
        className="w-8 h-8 rounded-full border border-gray-300 dark:border-[#282B32] flex items-center justify-center text-gray-600 dark:text-gray-400 disabled:opacity-30 transition-transform active:scale-90 active:bg-gray-100 dark:active:bg-[#282B32] active:border-gray-400 dark:active:border-gray-500"
      >
        +
      </button>
    </div>
  );
}
