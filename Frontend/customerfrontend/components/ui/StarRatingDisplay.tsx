// components/ui/StarRatingDisplay.tsx
// 별점을 읽기 전용으로 보여주는 별 아이콘 컴포넌트(star_active/inactive svg 사용)

export function StarRatingDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {[1, 2, 3, 4, 5].map((n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={n}
          src={n <= rounded ? "/icons/ui/star_active.svg" : "/icons/ui/star_inactive.svg"}
          alt=""
          width={size}
          height={size}
        />
      ))}
    </span>
  );
}
