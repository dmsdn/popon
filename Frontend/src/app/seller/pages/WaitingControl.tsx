import { useState } from "react";
import { BellRing, QrCode, LogIn, LogOut, RadioTower } from "lucide-react";
import { WAITING_QUEUE } from "../data";

const CAPACITY = 120;

export default function WaitingControl() {
  const [inside, setInside] = useState(97);
  const [queue, setQueue] = useState(WAITING_QUEUE.map((q) => ({ ...q })));

  const rate = Math.round((inside / CAPACITY) * 100);
  const level = rate >= 80 ? "혼잡" : rate >= 50 ? "보통" : "여유";
  const levelColor = rate >= 80 ? "text-red-500" : rate >= 50 ? "text-amber-500" : "text-emerald-500";
  const barColor = rate >= 80 ? "bg-red-500" : rate >= 50 ? "bg-amber-500" : "bg-emerald-500";

  const call = (no: number) => setQueue((prev) => prev.map((q) => (q.no === no ? { ...q, called: true } : q)));
  const remove = (no: number) => setQueue((prev) => prev.filter((q) => q.no !== no));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">실시간 대기열·인원 관제</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <RadioTower size={12} className="text-emerald-500" /> WebSocket 실시간 연동 (현재 모의 데이터 시뮬레이션)
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-xs px-4 py-2 border border-border rounded-sm hover:border-accent hover:text-accent">
          <QrCode size={13} /> 현장 QR 스캔 화면 열기
        </button>
      </div>

      {/* 혼잡도 모니터링 */}
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="bg-white border border-border rounded-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">현재 체류 인원 (혼잡도)</span>
            <span className={`text-sm font-bold ${levelColor}`}>{level}</span>
          </div>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-3xl font-semibold">{inside}</span>
            <span className="text-sm text-muted-foreground mb-1">/ 정원 {CAPACITY}명 ({rate}%)</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden mb-2">
            <div className={`h-full transition-all ${barColor}`} style={{ width: `${Math.min(rate, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-4">
            <span>여유 (~50%)</span><span>보통 (50~80%)</span><span>혼잡 (80%~)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setInside((v) => Math.min(v + 1, CAPACITY))} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm bg-foreground text-white hover:opacity-90">
              <LogIn size={13} /> 입장 +1
            </button>
            <button onClick={() => setInside((v) => Math.max(v - 1, 0))} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border border-border hover:bg-secondary">
              <LogOut size={13} /> 퇴장 −1
            </button>
          </div>
        </div>

        <div className="bg-white border border-border rounded-sm p-5 flex flex-col justify-between">
          <div>
            <div className="text-sm font-semibold mb-3">대기 현황</div>
            <div className="text-3xl font-semibold">{queue.length}<span className="text-sm font-normal text-muted-foreground ml-1">팀</span></div>
            <div className="text-xs text-muted-foreground mt-1">총 {queue.reduce((a, q) => a + q.count, 0)}명 · 예상 대기 {queue.length * 7}분</div>
          </div>
          <div className="text-[11px] text-muted-foreground bg-secondary/70 rounded-sm p-3 mt-4 leading-relaxed">
            혼잡 단계 진입 시 신규 웨이팅 등록이 자동으로 일시 중지되며, 소비자 앱에 혼잡 안내가 노출됩니다.
          </div>
        </div>
      </div>

      {/* 대기열 테이블 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">현장 대기열</div>
        <table className="w-full text-[13px] min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">순번</th>
              <th className="text-left font-medium px-4 py-2.5">대기자</th>
              <th className="text-right font-medium px-4 py-2.5">인원</th>
              <th className="text-right font-medium px-4 py-2.5">대기 시간</th>
              <th className="text-center font-medium px-4 py-2.5">호출</th>
              <th className="text-center font-medium px-4 py-2.5">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {queue.map((w) => (
              <tr key={w.no} className={w.called ? "bg-amber-50/60" : "hover:bg-secondary/40"}>
                <td className="px-4 py-2.5 font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>#{w.no}</td>
                <td className="px-4 py-2.5">{w.name}</td>
                <td className="px-4 py-2.5 text-right">{w.count}명</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground">{w.waited}</td>
                <td className="px-4 py-2.5 text-center">
                  {w.called ? (
                    <span className="text-[11px] text-amber-600 font-medium">호출됨</span>
                  ) : (
                    <button onClick={() => call(w.no)} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm bg-accent text-white hover:bg-accent/90">
                      <BellRing size={11} /> 호출
                    </button>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <div className="inline-flex gap-1.5">
                    <button onClick={() => { remove(w.no); setInside((v) => Math.min(v + w.count, CAPACITY)); }} className="text-[11px] px-2 py-1 rounded-sm border border-emerald-200 text-emerald-600 hover:bg-emerald-50">입장</button>
                    <button onClick={() => remove(w.no)} className="text-[11px] px-2 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50">노쇼</button>
                  </div>
                </td>
              </tr>
            ))}
            {queue.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">현재 대기 중인 팀이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
