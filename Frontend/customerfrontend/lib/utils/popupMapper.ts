// lib/utils/popupMapper.ts
// 백엔드 PopupResponse(getPopup/searchPopups 응답)를 화면 카드가 쓰는
// PopupItem 모양(data/mockPopups.ts)으로 변환합니다.

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
};

export function toPopupItem(popup: PopupDetail): PopupItem {
  return {
    id: String(popup.id),
    name: popup.title,
    // ⚠️ category: 백엔드 Popup 테이블에 카테고리 컬럼이 아직 없어서 비워둡니다.
    //    (검색화면 "카테고리" 필터는 그래서 아직 실 데이터로 안 채워져요 — backend-todo.md 11번 참고)
    dateRange: `${formatDate(popup.startDate)} ~ ${formatDate(popup.endDate)}`,
    location: popup.location ?? undefined,
    status: STATUS_MAP[popup.status],
  };
}
