"use client";

// 팝업 상세페이지 하단 고정 액션바 - 찜/사전예약/웨이팅/전화로 문의하기 버튼.

import { HeartButton } from "@/components/ui/HeartButton";
import type { PopupItem } from "@/data/mockPopups";

// 팝업 상세페이지 전용 고정 액션바입니다.
// 모바일: 화면 최하단에 고정 (이 페이지에서는 공용 하단 탭바 대신 이걸 띄워요)
// 데스크톱: 같은 방식으로 화면 하단에 고정 - 쇼핑몰의 "구매하기" 고정바와 같은 패턴이라
//   별도 사이드바 레이아웃을 새로 짜지 않고도 스크롤 중에도 항상 보이게 할 수 있어요.
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
}: {
  popupId: number;
  /** 팝업 진행 상태 - 웨이팅은 "진행중"일 때만, 예약은 "종료" 전까지 열어둬요.
      [참고] 예약은 나중에 "예약 오픈일"이 별도로 생기면 그 시점 기준으로 다시
      손봐야 해요 - 지금은 그 데이터가 없어서 "종료 여부"로만 판단해요. */
  popupStatus?: PopupItem["status"];
  /** [신규] 이 팝업이 예약만/웨이팅만/둘 다 지원하는지 - 지원 안 하는 쪽은
      상태랑 무관하게 버튼 자체를 숨겨요. */
  queueMode?: "PRERESERVATION_ONLY" | "ONSITE_WAITING_ONLY" | "BOTH" | null;
  /** [신규] SLOT 모드인데 등록된 시간대가 하나도 없으면 예약 버튼 자체를 숨겨요
      (예전엔 버튼은 보이는데 눌렀을 때만 "아직 등록 안 됨" 알림이 떴어요). */
  reservationMode?: "SLOT" | "FREE";
  hasSlots?: boolean;
  /** 현재 대기중인 팀 수. null이면 아직 못 불러온 상태(버튼엔 기본 라벨만 표시) */
  waitingTeams: number | null;
  wishlistCount?: number;
  onWishlistToggle?: (nextActive: boolean) => void;
  onReserve: () => void;
  onWaiting: () => void;
  /** [수정] 예약/웨이팅을 둘 다 지원 안 하는 팝업이면, 그 자리에 대신
      "전화로 문의하기" 버튼을 띄워요 - 1:1 문의 폼 대신 주최자 전화번호로
      바로 통화 연결해요. 전화번호가 없으면 버튼 자체를 숨겨요. */
  businessPhone?: string | null;
}) {
  const supportsWaiting = queueMode === "ONSITE_WAITING_ONLY" || queueMode === "BOTH";
  const noSlotsYet = reservationMode === "SLOT" && !hasSlots;
  const supportsReservation = (queueMode === "PRERESERVATION_ONLY" || queueMode === "BOTH") && !noSlotsYet;
  const waitingEnabled = supportsWaiting && popupStatus === "진행중";
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
            {reservationEnabled ? "사전 예약" : "예약 준비중"}
          </button>
        )}
        {/* [수정] 웨이팅/예약을 아예 지원 안 하는 팝업(queueMode)이면 버튼 자체를
            숨겨요. 지원은 하는데 지금 시점에 안 되는 경우만 비활성화로 보여줘요. */}
        {supportsWaiting && (
          <button
            type="button"
            onClick={onWaiting}
            disabled={!waitingEnabled}
            className="flex-1 rounded-full py-3 text-base font-medium bg-point text-gray-900 dark:text-white disabled:opacity-40 disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            {!waitingEnabled
              ? "웨이팅 준비중"
              : waitingTeams !== null && waitingTeams > 0
              ? `웨이팅 · ${waitingTeams}팀 대기중`
              : "웨이팅"}
          </button>
        )}
        {/* [수정] 예약/웨이팅 둘 다 지원 안 하면 그 자리에 "전화로 문의하기"를
            대신 띄워요 - 누르면 주최자 전화번호로 바로 통화 연결돼요. */}
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
