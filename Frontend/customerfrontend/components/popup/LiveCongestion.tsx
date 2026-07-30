import type { PopupLiveStatus } from "@/lib/api/popups";

const LABEL_COLOR: Record<PopupLiveStatus["congestionLabel"], string> = {
  여유: "text-green-600",
  보통: "text-amber-600",
  혼잡: "text-red-500",
};

const SEGMENT_COLOR: Record<PopupLiveStatus["congestionLabel"], string> = {
  여유: "bg-green-500",
  보통: "bg-amber-500",
  혼잡: "bg-red-500",
};

// 혼잡도 단계별로 3칸 중 몇 칸을 채울지 (신호 세기 표시 방식)
const FILLED_SEGMENTS: Record<PopupLiveStatus["congestionLabel"], number> = {
  여유: 1,
  보통: 2,
  혼잡: 3,
};

function Segments({ label, size = "md" }: { label: PopupLiveStatus["congestionLabel"]; size?: "sm" | "md" }) {
  const filled = FILLED_SEGMENTS[label];
  const height = size === "sm" ? "h-3" : "h-4";
  return (
    <div className="flex items-end gap-0.5">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${height} ${i <= filled ? SEGMENT_COLOR[label] : "bg-gray-200"}`}
          style={{ height: size === "sm" ? `${6 + i * 3}px` : `${8 + i * 4}px` }}
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
