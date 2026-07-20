import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { QrCode, CalendarClock, X, Pencil, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMyReservations, cancelReservation, fetchPopups, CustomerReservation } from "../lib/api";

const STATUS_LABEL: Record<CustomerReservation["status"], string> = {
  CONFIRMED: "확정",
  WAITING: "대기중",
  CANCELLED: "취소됨",
  VISITED: "이용완료",
};

const STATUS_STYLE: Record<CustomerReservation["status"], string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  WAITING: "bg-amber-50 text-amber-600 border-amber-200",
  CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
  VISITED: "bg-blue-50 text-blue-600 border-blue-200",
};

const fmtTime = (t: string) => t.slice(0, 5); // HH:mm:ss → HH:mm

export default function Reservations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<CustomerReservation[]>([]);
  const [popupNames, setPopupNames] = useState<Record<number, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    Promise.all([getMyReservations(), fetchPopups()])
      .then(([list, popups]) => {
        if (!alive) return;
        const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setRows(sorted);
        setPopupNames(Object.fromEntries(popups.map((p) => [p.id, p.title])));
        setOpen(sorted[0]?.id ?? null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "예약 내역을 불러오지 못했어요."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  const cancel = async (id: number) => {
    if (!window.confirm("예약을 취소할까요?")) return;
    try {
      await cancelReservation(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" as const } : r)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "취소에 실패했어요.");
    }
  };

  if (!user) {
    return (
      <div className="px-6 pt-16 flex flex-col items-center text-center">
        <p className="text-sm font-medium mb-1">로그인이 필요해요</p>
        <p className="text-xs text-muted-foreground mb-5">예약 내역을 확인하려면 로그인해 주세요.</p>
        <button onClick={() => navigate("/login")} className="text-sm px-8 py-3 rounded-lg bg-accent text-white font-medium">
          간편 로그인하기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>예약·웨이팅</h1>
          <p className="text-xs text-muted-foreground mt-0.5">예약 내역을 확인하고 취소할 수 있어요.</p>
        </div>
        <Link to="/waiting" className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-accent text-accent font-medium">
          <Users size={13} /> 내 웨이팅
        </Link>
      </div>

      {loading && <p className="px-4 py-8 text-center text-xs text-muted-foreground">불러오는 중…</p>}
      {error && <p className="px-4 py-3 text-center text-xs text-red-500">{error}</p>}

      <div className="px-4 flex flex-col gap-2.5">
        {!loading && rows.length === 0 && !error && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            아직 예약 내역이 없어요. <Link to="/" className="text-accent underline underline-offset-2">팝업 둘러보기</Link>
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3.5 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">{popupNames[r.popupId] ?? `팝업 #${r.popupId}`}</div>
                <div className="text-[11px] text-muted-foreground">{r.visitDate} {fmtTime(r.visitTime)} · {r.partySize}명</div>
              </div>
              {open === r.id ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
            </button>

            {open === r.id && (
              <div className="px-3.5 pb-3.5 border-t border-border pt-3 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span style={{ fontFamily: "'DM Mono', monospace" }}>예약번호 R-{String(r.id).padStart(4, "0")}</span>
                  <Link to={`/popup/${r.popupId}`} className="text-accent">팝업 상세 보기</Link>
                </div>

                {r.status === "CONFIRMED" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/70">
                    <QrCode size={36} className="text-foreground/70 shrink-0" />
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      입장 시 QR 티켓을 스태프에게 제시하세요.<br />방문 하루 전 알림을 보내드려요.
                    </div>
                  </div>
                )}

                {(r.status === "CONFIRMED" || r.status === "WAITING") && (
                  <div className="flex gap-2">
                    <button disabled title="예약 변경 API 백엔드 구성 후 연동 필요"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-border font-medium opacity-40 cursor-not-allowed">
                      <Pencil size={12} /> 날짜·인원 변경 (준비 중)
                    </button>
                    <button onClick={() => cancel(r.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg border border-red-200 text-red-500 font-medium">
                      <X size={13} /> 예약 취소
                    </button>
                  </div>
                )}

                {r.status === "VISITED" && (
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
