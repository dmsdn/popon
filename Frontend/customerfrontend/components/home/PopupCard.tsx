import Link from "next/link";
import { PopupItem } from "@/data/mockPopups";
import { HeartButton } from "@/components/ui/HeartButton";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function PopupCard({
  id,
  name,
  dateRange,
  location,
  badge,
  status,
  rank,
}: PopupItem & { rank?: number }) {
  return (
    <Link href={`/popup/${id}`} className="flex-none w-[190px] flex flex-col gap-2">
      {/* 이미지: 카드 테두리 없이 이미지 자체에만 4~8px 라운드 */}
      <div className="relative h-[190px] rounded-md overflow-hidden bg-gray-100 flex items-center justify-center text-xs text-gray-400">
        이미지
        {rank ? (
          <span className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
            {rank}
          </span>
        ) : (
          badge && (
            <span className="absolute top-2 left-2 text-xs font-bold bg-white text-gray-900 px-2 py-0.5 rounded shadow-sm">
              {badge}
            </span>
          )
        )}
        <HeartButton popupId={Number(id)} className="absolute top-2 right-2 w-7 h-7" />
      </div>

      {/* 정보: 이미지와 분리해서 아래에 별도로 모음 */}
      <div className="flex flex-col gap-0.5">
        <StatusBadge status={status} className="self-start mb-0.5" />
        <p className="text-base font-medium text-gray-900 truncate">{name}</p>
        {dateRange && <p className="text-sm text-gray-400">{dateRange}</p>}
        {location && <p className="text-sm text-gray-400">{location}</p>}
      </div>
    </Link>
  );
}
