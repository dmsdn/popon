"use client";

// 별점을 직접 매기는 입력용 별 5개 컴포넌트 (후기 작성 시 사용).

import { useState } from "react";

/**
 * 별 5개를 눌러서 별점을 매기는 입력 컴포넌트.
 * - N번째 별을 누르면 N점으로 설정 (예: 4번째 별 → 4점)
 * - 지금 별점과 똑같은 별을 다시 누르면 0점(선택 취소)으로 돌아감
 * - 선택 안 된 별은 회색, 선택된 별(그 위치까지)은 빨간색
 * - [신규] 마우스를 올리면(hover) 그 위치까지 미리 빨갛게 채워져서 몇 점이 될지
 *   눌러보기 전에 바로 보여요. 마우스를 떼면 실제 선택된 값으로 돌아가요.
 */
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
