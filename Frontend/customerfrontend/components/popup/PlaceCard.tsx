import Link from "next/link";
import { getCategoryIcon } from "@/lib/utils/categoryIcon";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

/**
 * 주변 핫플 / 비슷한 팝업 섹션에서 공용으로 쓰는 카드입니다.
 * [수정] 1:1에 가깝던 이미지를 4:3 가로형으로 바꾸고 전체 크기도 키웠어요.
 * 카테고리 텍스트 앞에는 회색 라인 아이콘을 붙여줘요.
 * imageUrl이 있으면 실제 이미지를, 없으면 기존처럼 "이미지" placeholder를 보여줘요.
 * href가 있으면 카드 전체가 링크로 동작해요 - internal=true면 같은 탭에서 이동하는
 * 앱 내부 페이지(Next.js Link)로, 아니면(기본값) 네이버 지도 같은 외부 링크로 새 탭에 열려요.
 */
export function PlaceCard({
  category,
  name,
  distance,
  imageUrl,
  href,
  internal = false,
}: {
  category: string;
  name: string;
  distance?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  internal?: boolean;
}) {
  const iconSrc = getCategoryIcon(category);

  const content = (
    <>
      {imageUrl ? (
        <ImageWithFallback src={imageUrl} className="w-full aspect-[4/3] rounded-lg mb-2 object-cover" />
      ) : (
        <div className="w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg mb-2 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          이미지
        </div>
      )}
      <p className="flex items-center gap-1 text-sm text-gray-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconSrc} alt="" width={16} height={16} className="flex-none" />
        {category}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-base font-medium truncate">{name}</p>
        {distance && <span className="text-sm text-gray-400 flex-none ml-1">{distance}</span>}
      </div>
    </>
  );

  if (href && internal) {
    return (
      <Link href={href} className="flex-none w-[200px]">
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex-none w-[200px]">
        {content}
      </a>
    );
  }

  return <div className="flex-none w-[200px]">{content}</div>;
}
