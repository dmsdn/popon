// components/popup/StickyActionBar.tsx
// 팝업 상세페이지 하단 고정 액션바 - 찜/사전예약/웨이팅/전화로 문의하기 버튼
"use client";

import { HeartButton } from "@/components/ui/HeartButton";
import type { PopupItem } from "@/data/mockPopups";

// 모바일: 화면 최하단에 고정 (팝업 상세 페이지에서는 공용 하단 탭바 대신 이거)
export function StickyActionBar({
  popupId,
  popupStatus,
  queueMode,
  reservationMode,
  hasSlots,
  waitingTeams,
  wishlistCount,
  onWishlistToggle,
  onReserve,
  onWaiting,
  businessPhone,
  todayClosed,
}: {
  popupId: number;
  popupStatus?: PopupItem["status"]; // 팝업 진행 상태 - 웨이팅은 "진행중"일 때만, 예약은 "종료" 전까지

  queueMode?: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null; // 이 팝업이 예약만/웨이팅만/둘 다 지원하는지
  reservationMode?: "SLOT" | "FREE";
  hasSlots?: boolean;
  waitingTeams: number | null; // 현재 대기중인 팀 수. null이면 기본 라벨만 표시
  wishlistCount?: number;
  onWishlistToggle?: (nextActive: boolean) => void;
  onReserve: () => void;
  onWaiting: () => void;
  businessPhone?: string | null; // 예약/웨이팅을 둘 다 지원 안 하는 팝업이면, 그 자리에 대신 "전화로 문의하기" 버튼
  todayClosed?: boolean; //오늘이 팝업 휴무일인지
}) {
  const supportsWaiting = queueMode === "ONSITE_WAITING_ONLY" || queueMode === "BOTH";
  const noSlotsYet = reservationMode === "SLOT" && !hasSlots;
  const supportsReservation = (queueMode === "PRERESERVATION_ONLY" || queueMode === "BOTH") && !noSlotsYet;
  const waitingEnabled = supportsWaiting && popupStatus === "진행중" && !todayClosed;
  const reservationEnabled = supportsReservation && (popupStatus === "진행중" || popupStatus === "예정");

  return (
    <div className="fixed bottom-14 mobile:bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#17181a] shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.3)]">
      <div className="w-full mobile:max-w-[1000px] mobile:mx-auto flex items-center gap-3 px-4 mobile:px-8 py-3">
        <div className="flex flex-col items-center flex-none">
          <HeartButton popupId={popupId} className="w-11 h-11" onToggle={onWishlistToggle} />
          {typeof wishlistCount === "number" && (
            <span className="text-sm text-gray-400 -mt-1">{wishlistCount}</span>
          )}
        </div>
        {supportsReservation && (
          <button
            type="button"
            onClick={onReserve}
            disabled={!reservationEnabled}
            className="flex-1 rounded-full py-3 text-base font-medium border-2 border-point text-gray-900 dark:text-white disabled:opacity-40 disabled:border-gray-300 dark:disabled:border-gray-700"
          >
            {reservationEnabled ? "사전 예약" : popupStatus === "종료" ? "종료된 팝업이에요" : "예약 준비중"}
          </button>
        )}
        {supportsWaiting && (
          <button
            type="button"
            onClick={onWaiting}
            disabled={!waitingEnabled}
            className="flex-1 rounded-full py-3 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-40 disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {popupStatus === "종료"
              ? "종료된 팝업이에요"
              : todayClosed
              ? "오늘은 휴무일이에요"
              : !waitingEnabled
              ? "웨이팅 준비중"
              : waitingTeams !== null && waitingTeams > 0
              ? `웨이팅 · ${waitingTeams}팀 대기중`
              : "웨이팅"}
          </button>
        )}
        {!supportsReservation && !supportsWaiting && businessPhone && (
          <a
            href={`tel:${businessPhone}`}
            className="flex-1 text-center rounded-full py-3 text-base font-medium border border-point text-gray-900 dark:text-white"
          >
            전화로 문의하기
          </a>
        )}
      </div>
    </div>
  );
}
