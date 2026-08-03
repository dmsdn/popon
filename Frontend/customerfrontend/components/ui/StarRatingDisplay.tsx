// components/ui/StarRatingDisplay.tsx
//
// [수정] 팀에서 주신 star_active.svg(빨강)/star_inactive.svg(회색) 파일로 교체했어요.

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
