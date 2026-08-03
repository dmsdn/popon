// components/popup/LiveCongestion.tsx
// 혼잡도 표시 컴포넌트 - 가로 3등분 바(여유=포인트컬러/보통=+노랑/혼잡=+빨강), 작은 버전(Mini)도 같이 export해요.

import type { PopupLiveStatus } from "@/lib/api/popups";

const LABEL_COLOR: Record<PopupLiveStatus["congestionLabel"], string> = {
  여유: "text-point",
  보통: "text-amber-500",
  혼잡: "text-red-500",
};

// [수정] 신호 세기(막대 높이가 다른 방식) 대신, 참고 이미지처럼 가로 막대를
// 3등분해서 칸마다 정해진 색(포인트→노랑→빨강)으로 순서대로 채워지는 방식으로
// 바꿨어요. 여유=포인트컬러 1칸, 보통=포인트+노랑 2칸, 혼잡=포인트+노랑+빨강 3칸.
const SEGMENT_COLORS = ["bg-point", "bg-amber-400", "bg-red-500"];

const FILLED_SEGMENTS: Record<PopupLiveStatus["congestionLabel"], number> = {
  여유: 1,
  보통: 2,
  혼잡: 3,
};

function Segments({ label, size = "md" }: { label: PopupLiveStatus["congestionLabel"]; size?: "sm" | "md" }) {
  const filled = FILLED_SEGMENTS[label];
  const height = size === "sm" ? "h-1.5" : "h-2";
  const width = size === "sm" ? "w-4" : "w-6";
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`${width} ${height} rounded-full ${
            i < filled ? SEGMENT_COLORS[i] : "bg-gray-200 dark:bg-[#282B32]"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * 팝업 상세페이지용 큰 버전. 신호 세그먼트 + 현재 인원/정원 텍스트를 보여줍니다.
 */
export function LiveCongestionPanel({ status }: { status: PopupLiveStatus }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold">실시간 혼잡도</p>
        <div className="flex items-center gap-2">
          <Segments label={status.congestionLabel} />
          <span className={`text-sm font-semibold ${LABEL_COLOR[status.congestionLabel]}`}>
            {status.congestionLabel}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-400">
        현재 {status.currentOccupancy}명 / 정원 {status.capacity}명 이용 중
      </p>
    </div>
  );
}

/**
 * 홈 화면 캐러셀용 작은 버전.
 */
export function LiveCongestionMini({ status }: { status: PopupLiveStatus }) {
  return (
    <div className="flex items-center gap-1.5">
      <Segments label={status.congestionLabel} size="sm" />
      <span className={`text-sm font-semibold ${LABEL_COLOR[status.congestionLabel]}`}>
        {status.congestionLabel}
      </span>
    </div>
  );
}
