"use client";

/**
 * 별 5개를 눌러서 별점을 매기는 입력 컴포넌트.
 * - N번째 별을 누르면 N점으로 설정 (예: 4번째 별 → 4점)
 * - 지금 별점과 똑같은 별을 다시 누르면 0점(선택 취소)으로 돌아감
 * - 선택 안 된 별은 회색, 선택된 별(그 위치까지)은 빨간색
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

  return (
    <div className="flex gap-1">
      {stars.map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            aria-label={`${star}점`}
            onClick={() => onChange(value === star ? 0 : star)}
            className="p-0.5"
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? "#ef4444" : "#d1d5db"}
              className="transition-colors"
            >
              <path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.8l7.1-.7z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
