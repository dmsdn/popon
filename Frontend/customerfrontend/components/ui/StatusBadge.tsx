import type { PopupItem } from "@/data/mockPopups";

const STATUS_STYLE: Record<NonNullable<PopupItem["status"]>, string> = {
  예정: "text-gray-500",
  진행중: "text-point font-semibold",
  종료: "bg-gray-100 text-gray-400",
};

export function StatusBadge({ status, className = "" }: { status?: PopupItem["status"]; className?: string }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[status]} ${className}`}>
      {status}
    </span>
  );
}
