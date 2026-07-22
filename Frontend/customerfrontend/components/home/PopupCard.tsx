import Link from "next/link";
import { PopupItem } from "@/data/mockPopups";

export function PopupCard({ id, name, dateRange, location, badge }: PopupItem) {
  return (
    <Link href={`/popup/${id}`} className="flex-none w-[150px]">
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="relative h-[120px] bg-gray-100">
          {/* TODO(백엔드 연동): PopupResponse에 썸네일 URL이 추가되면 이 임시 이미지를 실제 이미지로 교체 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/popup-placeholder.svg"
            alt=""
            className="w-full h-full object-cover"
          />
          {badge && (
            <span className="absolute top-2 left-2 text-xs font-bold bg-white px-2 py-0.5 rounded shadow">
              {badge}
            </span>
          )}
        </div>
        <div className="p-2">
          <p className="text-base font-medium">{name}</p>
          {dateRange && <p className="text-sm text-gray-400 mt-1">{dateRange}</p>}
          {location && <p className="text-sm text-gray-400">{location}</p>}
        </div>
      </div>
    </Link>
  );
}