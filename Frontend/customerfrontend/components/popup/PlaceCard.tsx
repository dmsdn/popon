/**
 * 주변 핫플 / 비슷한 팝업 섹션에서 공용으로 쓰는 작은 카드입니다.
 * imageUrl이 있으면 실제 이미지를, 없으면 기존처럼 "이미지" placeholder를 보여줘요.
 * href가 있으면 카드 전체가 새 탭 링크(예: 네이버 지도)로 동작해요.
 */
export function PlaceCard({
  category,
  name,
  distance,
  imageUrl,
  href,
}: {
  category: string;
  name: string;
  distance?: string | null;
  imageUrl?: string | null;
  href?: string | null;
}) {
  const content = (
    <>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-[150px] w-full rounded-lg mb-2 object-cover" />
      ) : (
        <div className="h-[150px] bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-xs text-gray-400">
          이미지
        </div>
      )}
      <p className="text-sm text-gray-400">{category}</p>
      <div className="flex items-center justify-between">
        <p className="text-base font-medium truncate">{name}</p>
        {distance && <span className="text-sm text-gray-400 flex-none ml-1">{distance}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-none w-[150px]">
        {content}
      </a>
    );
  }

  return <div className="flex-none w-[150px]">{content}</div>;
}