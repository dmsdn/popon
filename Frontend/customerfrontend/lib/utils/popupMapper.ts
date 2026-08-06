// lib/utils/popupMapper.ts
// 백엔드 PopupResponse(getPopup/searchPopups 응답)를 화면 카드가 쓰는 PopupItem 모양(data/mockPopups.ts)으로 변환

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

// 백엔드 PopupStatus → 프론트에서 쓰는 한글 상태값
const STATUS_MAP: Record<PopupDetail["status"], PopupItem["status"]> = {
  PENDING: "예정",
  REJECTED: "예정",
  BEFOR: "예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "종료",
};

export function toPopupItem(popup: PopupDetail): PopupItem {
  return {
    id: String(popup.id),
    name: popup.title,
    category: popup.hashtags?.[0],
    hashtags: popup.hashtags,
    keywordNames: popup.keywordNames,
    regionId: popup.regionId,
    dateRange: `${formatDate(popup.startDate)} ~ ${formatDate(popup.endDate)}`,
    location: popup.regionName ?? popup.location ?? undefined, // regionName(지역)이 있으면 그걸 우선 쓰고, 없으면 기존 location 자유텍스트로 대체
    status: STATUS_MAP[popup.status],
    imageUrl: popup.thumbnailImages?.[0],
    avgRating: popup.avgRating,
    brandName: popup.companyName,
  };
}
