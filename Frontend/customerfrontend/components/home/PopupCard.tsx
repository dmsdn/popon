// components/home/PopupCard.tsx
// 팝업 카드 컴포넌트 - 여러 섹션(캐러셀, 검색 결과 등)에서 재사용되는 기본 카드. 순위 배지, 찜 버튼 포함.

import Link from "next/link";
import { PopupItem } from "@/data/mockPopups";
import { HeartButton } from "@/components/ui/HeartButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

export function PopupCard({
  id,
  name,
  dateRange,
  location,
  badge,
  status,
  rank,
  imageUrl,
}: PopupItem & { rank?: number }) {
  return (
    <Link href={`/popup/${id}`} className="flex-none w-[190px] flex flex-col gap-2">
      {/* 이미지: 카드 테두리 없이 이미지 자체에만 4~8px 라운드 */}
      <div className="relative h-[190px] rounded-md overflow-hidden bg-gray-100 dark:bg-[#282B32] flex items-center justify-center text-sm text-gray-400">
        {imageUrl ? (
          <ImageWithFallback src={imageUrl} className="w-full h-full object-cover" />
        ) : (
          "이미지"
        )}
        {rank ? (
          <span
            className="absolute bottom-1 left-2 text-6xl font-bold text-white leading-none"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.55)" }}
          >
            {rank}
          </span>
        ) : (
          badge && (
            <span className="absolute top-2 left-2 text-sm font-bold bg-white dark:bg-[#282B32] text-gray-900 dark:text-white px-2 py-0.5 rounded shadow-sm">
              {badge}
            </span>
          )
        )}
        <HeartButton popupId={Number(id)} className="absolute top-2 right-2 w-7 h-7" />
      </div>

      {/* 정보: 이미지와 분리해서 아래에 별도로 모음 */}
      <div className="flex flex-col gap-0.5">
        <StatusBadge status={status} className="self-start mb-0.5" />
        <p className="text-base font-medium text-gray-900 dark:text-white truncate">{name}</p>
        {dateRange && <p className="text-sm text-gray-400">{dateRange}</p>}
        {/* [수정] 지역 글자가 다른 회색 텍스트(날짜 등)와 구분이 잘 안 됐어요 - 포인트 컬러로 눈에 띄게 했어요. */}
        {location && <p className="text-sm text-gray-400">{location}</p>}
      </div>
    </Link>
  );
}
