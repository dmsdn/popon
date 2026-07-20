/**
 * 주변 핫플 / 비슷한 팝업 섹션에서 공용으로 쓰는 작은 카드입니다.
 * ⚠️ 지금은 실데이터가 없어서 임시(placeholder) 텍스트를 props로 받는 형태로 만들었어요.
 *    실제로는 카페/맛집 데이터, 비슷한 팝업 데이터 소스가 따로 필요해요.
 */
export function PlaceCard({
  category,
  name,
  distance,
}: {
  category: string;
  name: string;
  distance?: string;
}) {
  return (
    <div className="flex-none w-[130px]">
      <div className="h-[100px] bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-xs text-gray-400">
        이미지
      </div>
      <p className="text-xs text-gray-400">{category}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium truncate">{name}</p>
        {distance && <span className="text-xs text-gray-400 flex-none ml-1">{distance}</span>}
      </div>
    </div>
  );
}