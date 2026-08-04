// components/ui/StatusBadge.tsx
// 팝업 상태(예정/진행중/종료) 배지.

import type { PopupItem } from "@/data/mockPopups";

const STATUS_STYLE: Record<NonNullable<PopupItem["status"]>, string> = {
  예정: "text-gray-500",
  진행중: "text-point font-semibold",
  // [수정] "종료"에 회색 배경(bg-gray-100)이 깔려있어서 팝업 카드마다 배지 뒤에
  // 불필요한 회색 박스가 떴어요. 예정/진행중과 똑같이 배경 없이 텍스트만 보이게 했어요.
  종료: "text-gray-400",
};

export function StatusBadge({ status, className = "" }: { status?: PopupItem["status"]; className?: string }) {
  if (!status) return null;
  return (
    <span className={`inline-flex items-center text-sm font-semibold px-2 py-0.5 rounded ${STATUS_STYLE[status]} ${className}`}>
      {status}
    </span>
  );
}
