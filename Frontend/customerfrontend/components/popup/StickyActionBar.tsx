"use client";

import { HeartButton } from "@/components/ui/HeartButton";

// 팝업 상세페이지 전용 고정 액션바입니다.
// 모바일: 화면 최하단에 고정 (이 페이지에서는 공용 하단 탭바 대신 이걸 띄워요)
// 데스크톱: 같은 방식으로 화면 하단에 고정 - 쇼핑몰의 "구매하기" 고정바와 같은 패턴이라
//   별도 사이드바 레이아웃을 새로 짜지 않고도 스크롤 중에도 항상 보이게 할 수 있어요.
export function StickyActionBar({
  popupId,
  waitingTeams,
  wishlistCount,
  onReserve,
  onWaiting,
}: {
  popupId: number;
  /** 현재 대기중인 팀 수. null이면 아직 못 불러온 상태(버튼엔 기본 라벨만 표시) */
  waitingTeams: number | null;
  wishlistCount?: number;
  onReserve: () => void;
  onWaiting: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      <div className="w-full mobile:max-w-[1000px] mobile:mx-auto flex items-center gap-3 px-4 mobile:px-8 py-3">
        <div className="flex flex-col items-center flex-none">
          <HeartButton popupId={popupId} className="w-11 h-11" />
          {typeof wishlistCount === "number" && (
            <span className="text-sm text-gray-400 -mt-1">{wishlistCount}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onReserve}
          className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-900 text-gray-900 dark:text-white"
        >
          사전 예약
        </button>
        <button
          type="button"
          onClick={onWaiting}
          className="flex-1 rounded-full py-3 text-sm font-medium bg-point text-gray-900 dark:text-white"
        >
          {waitingTeams !== null && waitingTeams > 0 ? `웨이팅 · ${waitingTeams}팀 대기중` : "웨이팅"}
        </button>
      </div>
    </div>
  );
}
