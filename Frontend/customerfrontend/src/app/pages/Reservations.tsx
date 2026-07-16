import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { QrCode, CalendarClock, X, Pencil, ChevronDown, ChevronUp, Users } from "lucide-react";
import { MY_RESERVATIONS, Reservation } from "../data";

const STATUS_STYLE: Record<Reservation["status"], string> = {
  확정: "bg-emerald-50 text-emerald-600 border-emerald-200",
  대기중: "bg-amber-50 text-amber-600 border-amber-200",
  취소됨: "bg-slate-100 text-slate-400 border-slate-200",
  이용완료: "bg-blue-50 text-blue-600 border-blue-200",
};

export default function Reservations() {
  const [rows, setRows] = useState(MY_RESERVATIONS.map((r) => ({ ...r })));
  const [open, setOpen] = useState<string | null>(rows[0]?.id ?? null);
  const navigate = useNavigate();

  const cancel = (id: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "취소됨" as const } : r)));

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>예약·웨이팅</h1>
          <p className="text-xs text-muted-foreground mt-0.5">예약 내역을 확인하고 변경·취소할 수 있어요.</p>
        </div>
        <Link to="/waiting" className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-accent text-accent font-medium">
          <Users size={13} /> 내 웨이팅
        </Link>
      </div>

      <div className="px-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3.5 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{r.popupName}</div>
                <div className="text-[11px] text-muted-foreground">{r.date} {r.time} · {r.count}명</div>
              </div>
              {open === r.id ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
            </button>

            {open === r.id && (
              <div className="px-3.5 pb-3.5 border-t border-border pt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>예약번호 {r.id}</span>
                  <Link to={`/popup/${r.popupId}`} className="text-accent">팝업 상세 보기</Link>
                </div>

                {r.status === "확정" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/70">
                    <QrCode size={36} className="text-foreground/70 shrink-0" />
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      입장 시 QR 티켓을 스태프에게 제시하세요.<br />방문 하루 전 알림을 보내드려요.
                    </div>
                  </div>
                )}

                {(r.status === "확정" || r.status === "대기중") && (
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-border font-medium">
                      <Pencil size={12} /> 날짜·인원 변경
                    </button>
                    <button onClick={() => cancel(r.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-red-200 text-red-500 font-medium">
                      <X size={13} /> 예약 취소
                    </button>
                  </div>
                )}

                {r.status === "이용완료" && (
                  <button onClick={() => navigate(`/popup/${r.popupId}/review`)}
                    className="w-full text-xs py-2.5 rounded-lg bg-accent text-white font-medium">
                    방문 인증됨 · 후기 작성하고 쿠폰 받기
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 mt-5">
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-secondary/70 text-[11px] text-muted-foreground leading-relaxed">
          <CalendarClock size={16} className="shrink-0" />
          예약 변경·취소는 방문 24시간 전까지 가능해요. 이후에는 팝업별 정책에 따라 제한될 수 있어요.
        </div>
      </div>
    </div>
  );
}
