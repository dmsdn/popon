// components/ui/StarRatingDisplay.tsx
//
// [수정] 후기 별점을 보여주는 곳마다 스타일이 제각각이었어요 (⭐ 이모지, 회색
// "★★★★★" 텍스트 등). 후기 작성 화면의 별점 선택(StarRatingInput, 빨강/회색)과
// 똑같은 톤으로 통일했어요 - 채워진 만큼 빨간 별, 나머지는 회색 별.

export function StarRatingDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= rounded ? "#ef4444" : "#d1d5db"}
        >
          <path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.8l7.1-.7z" />
        </svg>
      ))}
    </span>
  );
}
