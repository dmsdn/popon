"use client";

import { HeartButton } from "@/components/ui/HeartButton";

// 팝업 상세페이지 전용 고정 액션바입니다.
// 모바일: 화면 최하단에 고정 (이 페이지에서는 공용 하단 탭바 대신 이걸 띄워요)
// 데스크톱: 같은 방식으로 화면 하단에 고정 - 쇼핑몰의 "구매하기" 고정바와 같은 패턴이라
//   별도 사이드바 레이아웃을 새로 짜지 않고도 스크롤 중에도 항상 보이게 할 수 있어요.
export function StickyActionBar({
  popupId,
  onReserve,
  onWaiting,
}: {
  popupId: number;
  onReserve: () => void;
  onWaiting: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100">
      <div className="w-full mobile:max-w-[1000px] mobile:mx-auto flex items-center gap-3 px-4 mobile:px-8 py-3">
        <HeartButton
          popupId={popupId}
          className="w-11 h-11 flex-none border border-gray-200 bg-white"
        />
        <button
          type="button"
          onClick={onReserve}
          className="flex-1 rounded-full py-3 text-sm font-medium border border-gray-900 text-gray-900"
        >
          사전 예약
        </button>
        <button
          type="button"
          onClick={onWaiting}
          className="flex-1 rounded-full py-3 text-sm font-medium bg-gray-900 text-white"
        >
          웨이팅
        </button>
      </div>
    </div>
  );
}
