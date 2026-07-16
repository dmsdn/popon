import { useState } from "react";
import { Send, CheckCircle2, XCircle } from "lucide-react";
import { RESERVATION_SLOTS, RESERVATIONS, CheckinStatus } from "../data";

const STATUS_STYLE: Record<CheckinStatus, string> = {
  예약확정: "bg-blue-50 text-blue-600 border-blue-200",
  체크인: "bg-emerald-50 text-emerald-600 border-emerald-200",
  노쇼: "bg-red-50 text-red-500 border-red-200",
};

export default function Reservations() {
  const [tab, setTab] = useState<"slots" | "roster">("slots");
  const [rows, setRows] = useState(RESERVATIONS);

  const setStatus = (id: string, status: CheckinStatus) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">예약 슬롯·명단 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">「무너의 여름방학 팝업」 · 2026-07-15 (화)</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["slots", "예약 슬롯 설정"], ["roster", "예약자 명단"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "slots" ? (
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">시간대별 예약 가능 인원</span>
            <button className="text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90">슬롯 저장</button>
          </div>
          <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {RESERVATION_SLOTS.map((s) => {
              const rate = Math.round((s.booked / s.capacity) * 100);
              const full = s.booked >= s.capacity;
              return (
                <div key={s.time} className={`border rounded-sm p-3 ${full ? "border-accent/40 bg-accent/5" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>{s.time}</span>
                    <span className={`text-[11px] ${full ? "text-accent font-medium" : "text-muted-foreground"}`}>
                      {full ? "마감" : `잔여 ${s.capacity - s.booked}`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${full ? "bg-accent" : "bg-foreground/70"}`} style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.booked}/{s.capacity}명 예약</span>
                    <label className="flex items-center gap-1">
                      정원 <input type="number" defaultValue={s.capacity} className="w-14 px-1.5 py-0.5 border border-border rounded-sm text-right" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">오늘 예약자 {rows.length}건</span>
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-sm hover:border-accent hover:text-accent">
              <Send size={12} /> 순서 임박 알림 발송
            </button>
          </div>
          <table className="w-full text-[13px] min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">예약번호</th>
                <th className="text-left font-medium px-4 py-2.5">예약자</th>
                <th className="text-left font-medium px-4 py-2.5">연락처</th>
                <th className="text-left font-medium px-4 py-2.5">슬롯</th>
                <th className="text-right font-medium px-4 py-2.5">인원</th>
                <th className="text-left font-medium px-4 py-2.5">상태</th>
                <th className="text-center font-medium px-4 py-2.5">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{r.id}</td>
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.phone}</td>
                  <td className="px-4 py-2.5">{r.slot}</td>
                  <td className="px-4 py-2.5 text-right">{r.count}명</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setStatus(r.id, "체크인")}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      >
                        <CheckCircle2 size={11} /> 체크인
                      </button>
                      <button
                        onClick={() => setStatus(r.id, "노쇼")}
                        className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50"
                      >
                        <XCircle size={11} /> 노쇼
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
