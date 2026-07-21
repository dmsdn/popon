import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, Plus, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyPopups, getSlots, createSlot, getPopupReservations, checkinReservation, markNoShow,
  Popup, PopupSlot, ReservationDetail,
} from "../../lib/api";

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : ""); // HH:mm:ss → HH:mm

// 입장 상태 표기 (PENDING=입장 전, CHECKED_IN=입장완료, NO_SHOW=노쇼)
const ENTRY_BADGE: Record<string, [string, string]> = {
  PENDING: ["입장 전", "bg-blue-50 text-blue-600 border-blue-200"],
  CHECKED_IN: ["입장완료", "bg-emerald-50 text-emerald-600 border-emerald-200"],
  NO_SHOW: ["노쇼", "bg-red-50 text-red-500 border-red-200"],
};

export default function Reservations() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [tab, setTab] = useState<"slots" | "roster">("slots");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [roster, setRoster] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 슬롯 추가 폼
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ slotDate: "", startTime: "10:00", endTime: "11:00", capacity: 20 });
  const [saving, setSaving] = useState(false);
  const [entryActingId, setEntryActingId] = useState<number | null>(null);

  // 입장 처리: 수동 체크인 / 노쇼
  const handleEntry = async (id: number, action: "checkin" | "noshow") => {
    if (action === "noshow" && !window.confirm("노쇼로 처리할까요?")) return;
    setEntryActingId(id);
    try {
      const updated = action === "checkin" ? await checkinReservation(id) : await markNoShow(id);
      setRoster((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setEntryActingId(null);
    }
  };

  // 내 팝업 목록 로드 → 첫 팝업 자동 선택
  useEffect(() => {
    if (!isBusiness) return;
    getMyPopups()
      .then((list) => {
        setPopups(list);
        if (list.length > 0) setPopupId((prev) => prev ?? list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."));
  }, [isBusiness]);

  // 선택된 팝업의 슬롯·명단 로드
  useEffect(() => {
    if (!popupId) return;
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([getSlots(popupId), getPopupReservations(popupId)])
      .then(([s, r]) => {
        if (!alive) return;
        setSlots(s);
        setRoster(r);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [popupId]);

  const selected = popups.find((p) => p.id === popupId) ?? null;

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupId) return;
    setSaving(true);
    try {
      const created = await createSlot(popupId, {
        slotDate: form.slotDate,
        startTime: form.startTime + ":00",
        endTime: form.endTime + ":00",
        capacity: form.capacity,
      });
      setSlots((prev) => [...prev, created]);
      setShowForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "슬롯 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!isBusiness) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">예약 슬롯·명단 관리</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          주최자(사업자) 계정으로 로그인해야 사용할 수 있습니다.{" "}
          <Link to="/login" state={{ from: "/seller/reservations" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">예약 슬롯·명단 관리</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            시간대별 예약 가능 인원을 설정하고 예약자 명단을 확인합니다.
          </p>
        </div>
        {popups.length > 0 && (
          <select
            value={popupId ?? ""}
            onChange={(e) => setPopupId(Number(e.target.value))}
            className="px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
          >
            {popups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      {popups.length === 0 && !error && (
        <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. <Link to="/seller/popups/new" className="text-accent underline underline-offset-2">팝업을 먼저 등록</Link>해 주세요.
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {selected && (
        <>
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
                {k === "roster" && ` (${roster.length})`}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center text-xs text-muted-foreground py-10">
              <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
            </div>
          )}

          {!loading && tab === "slots" && (
            <div className="bg-white border border-border rounded-sm">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold">시간대별 예약 가능 인원</span>
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90"
                >
                  <Plus size={12} /> 슬롯 추가
                </button>
              </div>

              {showForm && (
                <form onSubmit={handleCreateSlot} className="px-4 py-3 border-b border-border bg-secondary/40 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    날짜
                    <input
                      type="date" required value={form.slotDate}
                      onChange={(e) => setForm((p) => ({ ...p, slotDate: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    시작
                    <input
                      type="time" required value={form.startTime}
                      onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    종료
                    <input
                      type="time" required value={form.endTime}
                      onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                      className="px-2 py-1.5 text-xs border border-border rounded-sm bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    정원
                    <input
                      type="number" min={1} required value={form.capacity}
                      onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                      className="w-20 px-2 py-1.5 text-xs border border-border rounded-sm bg-white text-right"
                    />
                  </label>
                  <button
                    type="submit" disabled={saving}
                    className="text-xs px-4 py-2 rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50"
                  >
                    {saving ? "저장 중…" : "저장"}
                  </button>
                </form>
              )}

              <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {slots.map((s) => {
                  const rate = s.capacity > 0 ? Math.round((s.reservedCount / s.capacity) * 100) : 0;
                  const full = s.remaining <= 0;
                  return (
                    <div key={s.id} className={`border rounded-sm p-3 ${full ? "border-accent/40 bg-accent/5" : "border-border"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {s.slotDate.slice(5)} {fmtTime(s.startTime)}~{fmtTime(s.endTime)}
                        </span>
                        <span className={`text-[11px] ${full ? "text-accent font-medium" : "text-muted-foreground"}`}>
                          {full ? "마감" : `잔여 ${s.remaining}`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${full ? "bg-accent" : "bg-foreground/70"}`} style={{ width: `${rate}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground">{s.reservedCount}/{s.capacity}명 예약</div>
                    </div>
                  );
                })}
                {slots.length === 0 && (
                  <div className="col-span-full text-center text-xs text-muted-foreground py-8">
                    등록된 슬롯이 없습니다. 「슬롯 추가」로 시간대별 정원을 설정해 주세요.
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === "roster" && (
            <div className="bg-white border border-border rounded-sm overflow-x-auto">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">예약자 {roster.length}건</span>
                <span className="text-[11px] text-muted-foreground">
                  취소된 예약도 명단에 「예약취소」로 남으며, 현장 대기열에는 편입되지 않습니다
                </span>
              </div>
              <table className="w-full text-[13px] min-w-[720px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5">예약번호</th>
                    <th className="text-left font-medium px-4 py-2.5">예약자</th>
                    <th className="text-left font-medium px-4 py-2.5">일시</th>
                    <th className="text-right font-medium px-4 py-2.5">인원</th>
                    <th className="text-left font-medium px-4 py-2.5">상태</th>
                    <th className="text-center font-medium px-4 py-2.5">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roster.map((r) => {
                    const cancelled = r.status === "CANCELLED";
                    const [entryLabel, entryCls] = ENTRY_BADGE[r.entryStatus ?? "PENDING"] ?? ENTRY_BADGE.PENDING;
                    return (
                      <tr key={r.id} className={`hover:bg-secondary/40 ${cancelled ? "opacity-50" : ""}`}>
                        <td className="px-4 py-2.5 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>R-{String(r.id).padStart(4, "0")}</td>
                        <td className="px-4 py-2.5 font-medium">{r.customerNickname}</td>
                        <td className="px-4 py-2.5">
                          {r.reservationDate}{r.startTime ? ` ${fmtTime(r.startTime)}~${fmtTime(r.endTime)}` : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right">{r.partySize}명</td>
                        <td className="px-4 py-2.5">
                          {cancelled ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-400 border-slate-200">예약취소</span>
                          ) : (
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${entryCls}`}>{entryLabel}</span>
                          )}
                          {r.checkedInAt && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{r.checkedInAt.slice(5, 16).replace("T", " ")}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {!cancelled && r.entryStatus === "PENDING" && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEntry(r.id, "checkin")}
                                disabled={entryActingId === r.id}
                                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-emerald-200 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                              >
                                <CheckCircle2 size={11} /> 체크인
                              </button>
                              <button
                                onClick={() => handleEntry(r.id, "noshow")}
                                disabled={entryActingId === r.id}
                                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                              >
                                <XCircle size={11} /> 노쇼
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {roster.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">아직 예약자가 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
