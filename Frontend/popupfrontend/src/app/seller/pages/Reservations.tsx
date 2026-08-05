import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Loader2, CheckCircle2, XCircle, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMyPopups, getSlots, getPopupReservations, checkinReservation, markNoShow,
  Popup, PopupSlot, ReservationDetail,
} from "../../lib/api";
import { ensureSlots } from "../../lib/slotAutoGen";
import { restoreSelectedPopup, saveSelectedPopup } from "../../lib/popupSelection";

const fmtTime = (t: string | null) => (t ? t.slice(0, 5) : ""); // HH:mm:ss → HH:mm

// 로컬 기준 오늘 날짜 (toISOString은 UTC라 자정 근처 날짜 밀림 — 사용 금지)
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// 기본 날짜: 오늘 슬롯이 있으면 오늘 → 없으면 오늘 이후 가장 가까운 날 → 그것도 없으면 마지막 날
// (7/25 피드백: 라우팅 시 당일이 default로 보여야 함)
function pickDefaultDate(dates: string[]): string {
  if (dates.length === 0) return "";
  const today = todayStr();
  if (dates.includes(today)) return today;
  return dates.find((d) => d > today) ?? dates[dates.length - 1];
}

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
  // 7/29 — 상세페이지에서 ?popup=id 로 넘어오면 그 팝업을 바로 선택
  const [searchParams] = useSearchParams();
  const initialPopupId = Number(searchParams.get("popup")) || null;
  const [popupId, setPopupId] = useState<number | null>(initialPopupId);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [roster, setRoster] = useState<ReservationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 슬롯은 수동 추가 없이 팝업 등록 정보(운영시간 × 슬롯 단위) 기준 자동 생성
  const [slotDateFilter, setSlotDateFilter] = useState<string>("");
  const [autoGenNote, setAutoGenNote] = useState("");
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
        // 우선순위: URL 쿼리(?popup=) → 다른 화면에서 마지막으로 고른 팝업(localStorage) → 첫 팝업.
        // 쿼리로 받은 팝업이 내 목록에 없으면(잘못된 id 등) 그다음 순위로 폴백 (8/5)
        if (list.length > 0)
          setPopupId((prev) =>
            prev && list.some((p) => p.id === prev) ? prev : restoreSelectedPopup(list, list[0].id),
          );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."));
  }, [isBusiness]);

  const selected = popups.find((p) => p.id === popupId) ?? null;

  // 8/5 — 마지막 선택을 기억해 관제·성과·공지에서도 같은 팝업이 잡히게 한다
  useEffect(() => { if (popupId != null) saveSelectedPopup(popupId); }, [popupId]);

  // 선택된 팝업의 슬롯·명단 로드 + SLOT 모드면 누락 슬롯 자동 생성(등록 정보 기준, 없는 것만)
  useEffect(() => {
    if (!popupId) return;
    let alive = true;
    setLoading(true);
    setError("");
    setAutoGenNote("");
    const popup = popups.find((p) => p.id === popupId);
    const loadSlots = async (): Promise<PopupSlot[]> => {
      if (popup && popup.reservationMode === "SLOT") {
        // 슬롯당 정원: 기존 슬롯 정원 → 없으면 동시 수용 정원 → 기본 10 (서버 일괄 생성 API, 멱등)
        const existing = await getSlots(popupId);
        const perSlotCap = existing[0]?.capacity ?? popup.capacity ?? 10;
        const { created, keptStale, existing: all } = await ensureSlots(popup, perSlotCap);
        if (created > 0 || keptStale > 0) {
          setAutoGenNote(
            [
              created > 0 ? `등록 정보 기준 예약 슬롯 ${created}개를 자동 생성했습니다.` : "",
              keptStale > 0 ? `이전 설정의 슬롯 ${keptStale}개는 예약이 있어 유지 중입니다.` : "",
            ].filter(Boolean).join(" "),
          );
        }
        return all;
      }
      return getSlots(popupId);
    };
    Promise.all([loadSlots(), getPopupReservations(popupId)])
      .then(([s, r]) => {
        if (!alive) return;
        setSlots(s);
        setRoster(r);
        // 기본 날짜 = 오늘 (직접 고른 날짜가 여전히 유효하면 유지) — 7/25 피드백
        setSlotDateFilter((prev) => {
          if (prev && s.some((x) => x.slotDate === prev)) return prev;
          return pickDefaultDate([...new Set(s.map((x) => x.slotDate))].sort());
        });
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "데이터를 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [popupId, popups]);

  // 날짜별 보기 (자동 생성 슬롯이 많아 날짜 단위로 선택)
  const slotDates = useMemo(() => [...new Set(slots.map((s) => s.slotDate))].sort(), [slots]);
  const daySlots = slots
    .filter((s) => s.slotDate === slotDateFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
            className="px-3 py-2 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
          >
            {popups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        )}
      </div>

      {popups.length === 0 && !error && (
        <div className="bg-card border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. <Link to="/seller/popups/new" className="text-accent underline underline-offset-2">팝업을 먼저 등록</Link>해 주세요.
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {selected && (
        <>
          <div className="flex gap-1 border-b border-border">
            {([["slots", "예약 슬롯 현황"], ["roster", "예약자 명단"]] as const).map(([k, label]) => (
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
            <div className="bg-card border border-border rounded-sm">
              <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">시간대별 예약 현황</span>
                <span className="text-[11px] text-muted-foreground">
                  슬롯은 팝업 등록 정보(운영기간·운영시간·슬롯 단위) 기준으로 자동 생성됩니다
                </span>
              </div>

              {autoGenNote && (
                <div className="px-4 py-2.5 border-b border-border bg-emerald-50 text-xs text-emerald-700 flex items-center gap-1.5">
                  <Info size={12} /> {autoGenNote}
                </div>
              )}

              {selected.reservationMode === "FREE" && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  당일 방문형(FREE) 팝업입니다 — 시간 슬롯 없이 날짜 단위로 예약을 받습니다.
                  <br />슬롯 예약제로 바꾸려면 팝업 수정에서 「사전예약제 운영」을 선택해 주세요.
                </div>
              )}

              {selected.reservationMode !== "FREE" && (
                <>
                  {/* 날짜 선택 → 해당 날짜의 슬롯별 예약 현황 */}
                  {slotDates.length > 0 && (
                    <div className="px-4 py-2.5 border-b border-border flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
                      {slotDates.map((d) => (
                        <button
                          key={d}
                          onClick={() => setSlotDateFilter(d)}
                          className={`text-[11px] px-2.5 py-1 rounded-full border ${
                            slotDateFilter === d ? "bg-foreground text-primary-foreground border-foreground" : "border-border text-muted-foreground hover:border-foreground"
                          }`}
                          style={{ fontFamily: "'DM Mono', monospace" }}
                        >
                          {d.slice(5)}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {daySlots.map((s) => {
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
                          <div className="text-xs text-muted-foreground">{s.reservedCount}/{s.capacity} 예약</div>
                        </div>
                      );
                    })}
                    {slots.length === 0 && (
                      <div className="col-span-full text-center text-xs text-muted-foreground py-8">
                        생성된 슬롯이 없습니다. 팝업 등록/수정에서 운영시간과 슬롯 단위를 설정하면 자동 생성됩니다.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!loading && tab === "roster" && (
            <div className="bg-card border border-border rounded-sm overflow-x-auto">
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
