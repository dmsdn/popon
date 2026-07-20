import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AdminLoginGate from "../components/AdminLoginGate";
import { getPopups, approvePopup, rejectPopup, Popup, PopupStatusCode, ApiError } from "../../lib/api";

const STATE_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "대기",
  REJECTED: "반려",
  BEFOR: "승인",
  OPEN: "게시중",
  CLOSED: "종료",
};

const STATE_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  BEFOR: "bg-emerald-50 text-emerald-600 border-emerald-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
};

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");
const fmtDateTime = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function PopupReview() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    setLoading(true);
    getPopups()
      .then((all) => {
        if (!alive) return;
        // 심사 대기(PENDING) 우선, 이후 최근 등록순
        const sorted = [...all].sort((a, b) => {
          if ((a.status === "PENDING") !== (b.status === "PENDING")) return a.status === "PENDING" ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        });
        setPopups(sorted);
        setOpen(sorted.find((p) => p.status === "PENDING")?.id ?? null);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  const decide = async (p: Popup, action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) {
      alert("반려 사유를 입력해 주세요. (주최자에게 전달됩니다)");
      return;
    }
    setActingId(p.id);
    try {
      const updated = action === "approve" ? await approvePopup(p.id) : await rejectPopup(p.id, reason.trim());
      setPopups((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      setOpen(null);
      setReason("");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.");
        logout();
      } else {
        alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
      }
    } finally {
      setActingId(null);
    }
  };

  const pendingCount = popups.filter((p) => p.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">팝업 심사·게시 승인</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            주최자가 등록한 팝업을 검수 후 승인/반려합니다. 승인 시 오픈예정(BEFOR) 상태로 전환되어 소비자에게 노출됩니다.
          </p>
        </div>
        {isAdmin && (
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">{user.name} 님 (관리자)</div>
            <button onClick={logout} className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground">로그아웃</button>
          </div>
        )}
      </div>

      {!isAdmin ? (
        <AdminLoginGate />
      ) : (
        <>
          {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
          {loading && (
            <div className="text-center text-xs text-muted-foreground py-10">
              <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
            </div>
          )}
          {!loading && !error && (
            <div className="text-xs text-muted-foreground">심사 대기 {pendingCount}건 · 전체 {popups.length}건</div>
          )}

          <div className="flex flex-col gap-3">
            {popups.map((p) => (
              <div key={p.id} className="bg-white border border-border rounded-sm">
                <button className="w-full px-5 py-4 flex items-center gap-4 text-left" onClick={() => { setOpen(open === p.id ? null : p.id); setReason(""); }}>
                  <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATE_BADGE[p.status]}`}>{STATE_LABEL[p.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.companyName} · {fmtDate(p.startDate)} ~ {fmtDate(p.endDate)} · {p.location ?? "장소 미정"}
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="text-[11px] text-muted-foreground">등록 {fmtDateTime(p.createdAt)}</div>
                    <div className="text-[11px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>PU-{String(p.id).padStart(4, "0")}</div>
                  </div>
                  {open === p.id ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
                </button>

                {open === p.id && (
                  <div className="px-5 pb-5 border-t border-border pt-4 flex flex-col gap-4">
                    <div className="bg-secondary/60 rounded-sm p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">소개글</div>
                      <div className="text-[13px] whitespace-pre-wrap">{p.description || "(소개글 없음)"}</div>
                    </div>

                    {p.status === "REJECTED" && p.rejectReason && (
                      <div className="bg-red-50 border border-red-200 rounded-sm px-3 py-2 text-xs text-red-600">
                        반려 사유: {p.rejectReason}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium mb-1.5">반려 사유 (반려 시 필수 · 주최자에게 전달됨)</label>
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="예: 대표 이미지 화질 기준 미달"
                          className="w-full px-3 py-2 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => decide(p, "reject")}
                          disabled={actingId === p.id}
                          className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-sm border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          {actingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} 반려
                        </button>
                        <button
                          onClick={() => decide(p, "approve")}
                          disabled={actingId === p.id}
                          className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 승인·게시
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!loading && !error && popups.length === 0 && (
              <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
                등록된 팝업이 없습니다.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
