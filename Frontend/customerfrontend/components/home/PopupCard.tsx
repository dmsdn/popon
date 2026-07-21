import Link from "next/link";
import { PopupItem } from "@/data/mockPopups";

export function PopupCard({ id, name, dateRange, location, badge }: PopupItem) {
  return (
    <Link href={`/popup/${id}`} className="flex-none w-[150px]">
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="relative h-[120px] bg-gray-100 flex items-center justify-center text-xs text-gray-400">
          이미지
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