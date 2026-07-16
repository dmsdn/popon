import { useState } from "react";
import { Link } from "react-router";
import { BellRing, X, RadioTower, MapPin } from "lucide-react";
import { POPUPS } from "../data";

export default function Waiting() {
  const [joined, setJoined] = useState(true);
  const [teamsAhead] = useState(3);
  const popup = POPUPS[0];

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>원격 줄서기</h1>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <RadioTower size={12} className="text-emerald-500" /> 실시간으로 대기 순서가 갱신돼요.
        </p>
      </div>

      {joined ? (
        <div className="px-4">
          {/* 내 웨이팅 카드 */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 text-center">
            <div className="text-xs text-accent font-medium mb-1">{popup.name}</div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 mb-4">
              <MapPin size={11} /> {popup.location}
            </div>
            <div className="text-[13px] text-muted-foreground">내 앞 대기</div>
            <div className="text-5xl font-bold text-accent my-1" style={{ fontFamily: "'DM Mono', monospace" }}>{teamsAhead}</div>
            <div className="text-[13px] text-muted-foreground mb-4">팀 · 예상 대기 {teamsAhead * 7}분</div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 w-fit mx-auto mb-5">
              <BellRing size={12} /> 내 차례가 가까워지면 푸시 알림을 보내드려요
            </div>
            <div className="text-[11px] text-muted-foreground mb-4" style={{ fontFamily: "'DM Mono', monospace" }}>
              대기번호 #44 · 2명 · 등록 14:21
            </div>
            <button onClick={() => setJoined(false)}
              className="w-full flex items-center justify-center gap-1.5 text-sm py-3 rounded-lg border border-red-200 text-red-500 font-medium">
              <X size={15} /> 웨이팅 취소
            </button>
          </div>

          <div className="mt-4 p-3.5 rounded-lg bg-secondary/70 text-[11px] text-muted-foreground leading-relaxed">
            호출 후 10분 내 미입장 시 자동 노쇼 처리돼요. 같은 팝업에는 당일 1회 재등록할 수 있어요.
          </div>
        </div>
      ) : (
        <div className="px-4 flex flex-col gap-3">
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm font-medium mb-1">진행 중인 웨이팅이 없어요</p>
            <p className="text-xs text-muted-foreground mb-5">붐비는 팝업은 원격 줄서기로 기다림 없이 방문하세요.</p>
            <button onClick={() => setJoined(true)} className="text-sm px-6 py-3 rounded-lg bg-accent text-white font-medium">
              {popup.name} 줄서기
            </button>
          </div>
          <Link to="/explore" className="text-center text-xs text-muted-foreground underline underline-offset-2">웨이팅 가능한 팝업 둘러보기</Link>
        </div>
      )}
    </div>
  );
}
