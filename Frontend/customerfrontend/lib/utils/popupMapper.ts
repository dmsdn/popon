// lib/utils/popupMapper.ts
// 백엔드 PopupResponse(getPopup/searchPopups 응답)를 홈 화면 카드가 쓰는
// PopupItem 모양으로 변환합니다. (data/mockPopups.ts의 PopupItem과 동일한 형태)

import type { PopupDetail } from "@/lib/api/popups";
import type { PopupItem } from "@/data/mockPopups";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export function toPopupItem(popup: PopupDetail): PopupItem {
  return {
    id: String(popup.id),
    name: popup.title,
    dateRange: popup.startDate && popup.endDate
      ? `${formatDate(popup.startDate)} ~ ${formatDate(popup.endDate)}`
      : undefined,
    location: popup.location ?? undefined,
    // PopupItem.status는 PopupDetail.status와 동일한 PopupStatus 타입이라 그대로 넘기면 돼요.
    status: popup.status,
    // badge, brandId: 백엔드 응답에 아직 없는 필드라 비워둡니다.
  };
}