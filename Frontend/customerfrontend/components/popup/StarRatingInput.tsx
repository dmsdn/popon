// components/popup/StarRatingInput.tsx
// 별점을 직접 매기는 입력용 별 5개 컴포넌트 (후기 작성 시 사용)
"use client";

import { useState } from "react";

export function StarRatingInput({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;

  return (
    <div className="flex gap-1" onMouseLeave={() => setHoverValue(null)}>
      {stars.map((star) => {
        const filled = star <= displayValue;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star}점`}
            onClick={() => onChange(value === star ? 0 : star)}
            onMouseEnter={() => setHoverValue(star)}
            className="p-0.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={filled ? "/icons/ui/star_active.svg" : "/icons/ui/star_inactive.svg"}
              alt=""
              width={size}
              height={size}
            />
          </button>
        );
      })}
    </div>
  );
}
