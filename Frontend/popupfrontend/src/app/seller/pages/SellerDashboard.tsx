// [역할] 주최자 센터 홈 대시보드 — 로그인한 사업자의 실데이터 요약.
// 내 팝업 목록(getMyPopups)을 기준으로 대표 팝업(진행중 우선)을 정하고,
// 그 팝업의 오늘 예약·방문(체크인)·현재 대기열을 슬롯/예약/통합보드 API로 집계한다.
// (기존 seller/data.ts 목업 의존 제거 — 이 화면은 전면 실연동)
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, AlertTriangle, Users, CalendarCheck, Store, FileClock } from "lucide-react";
import {
  getMyPopups, getSlots, getPopupReservations, getQueueBoard, getToken,
  type Popup, type PopupSlot, type ReservationDetail, type UnifiedEntry, type PopupStatusCode,
} from "../../lib/api";
import { isSuspended } from "../../lib/adminPopupMeta";

// 백엔드 PopupStatus → 화면 표기 (PopupList와 동일 규약)
const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
};
const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
};

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtPeriod = (p: Popup) =>
  p.startDate && p.endDate ? `${p.startDate.slice(0, 10)} ~ ${p.endDate.slice(5, 10)}` : "기간 미정";

export default function SellerDashboard() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [queue, setQueue] = useState<UnifiedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = toDateStr(new Date());

  // 대표 팝업: 진행중(OPEN) 우선 → 오픈예정(BEFOR) → 그 외 첫 번째
  const activePopup = useMemo(() => {
    return (
      popups.find((p) => p.status === "OPEN") ??
      popups.find((p) => p.status === "BEFOR") ??
      popups[0] ??
      null
    );
  }, [popups]);

  // 1) 내 팝업 목록
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    getMyPopups()
      .then(setPopups)
      .catch(() => setPopups([]))
      .finally(() => setLoading(false));
  }, []);

  // 2) 대표 팝업의 슬롯·예약·대기열 (실패해도 나머지 지표는 표시)
  useEffect(() => {
    if (!activePopup) { setSlots([]); setReservations([]); setQueue([]); return; }
    getSlots(activePopup.id).then(setSlots).catch(() => setSlots([]));
    getPopupReservations(activePopup.id).then(setReservations).catch(() => setReservations([]));
    getQueueBoard(activePopup.id).then((b) => setQueue(b.entries)).catch(() => setQueue([]));
  }, [activePopup?.id]);

  // ── KPI 집계 (전부 실데이터) ──
  const todayConfirmed = reservations.filter(
    (r) => r.status === "CONFIRMED" && r.reservationDate === todayStr,
  );
  const todayVisitors = todayConfirmed
    .filter((r) => r.entryStatus === "CHECKED_IN")
    .reduce((sum, r) => sum + r.partySize, 0);
  const todayPartySum = todayConfirmed.reduce((sum, r) => sum + r.partySize, 0);

  const todaySlots = slots.filter((s) => s.slotDate === todayStr);
  const slotCap = todaySlots.reduce((s, x) => s + x.capacity, 0);
  const slotReserved = todaySlots.reduce((s, x) => s + x.reservedCount, 0);
  const fillRate = slotCap > 0 ? Math.round((slotReserved / slotCap) * 100) : null;

  // 통합 보드에서 아직 입장 전인 팀만 대기열로 집계
  const waitingEntries = queue.filter((e) =>
    ["PENDING", "WAITING", "CALLED"].includes(e.entryStatus),
  );
  const waitingFromReservation = waitingEntries.filter((e) => e.source === "RESERVATION").length;
  const waitingOnsite = waitingEntries.filter((e) => e.source === "ONSITE_WAITING").length;

  const rejectedPopups = popups.filter((p) => p.status === "REJECTED");
  const pendingCount = popups.filter((p) => p.status === "PENDING").length;

  const kpis = [
    {
      icon: Users, label: "오늘 방문자",
      value: `${todayVisitors.toLocaleString()}명`,
      diff: "QR 체크인 기준",
    },
    {
      icon: CalendarCheck, label: "오늘 예약",
      value: `${todayConfirmed.length}건`,
      diff:
        fillRate !== null
          ? `${todayPartySum}명 · 슬롯 소진율 ${fillRate}%`
          : activePopup?.reservationMode === "FREE"
            ? `${todayPartySum}명 (자유 방문제)`
            : `${todayPartySum}명 · 오늘 운영 슬롯 없음`,
    },
    {
      icon: Store, label: "현재 대기열",
      value: `${waitingEntries.length}팀`,
      diff: `사전예약 ${waitingFromReservation} · 현장 ${waitingOnsite}`,
    },
    {
      icon: FileClock, label: "심사 현황",
      value: `대기 ${pendingCount}건`,
      diff: rejectedPopups.length > 0 ? `반려 ${rejectedPopups.length}건 — 확인 필요` : "반려 없음",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayStr} 기준
            {activePopup
              ? ` · ${STATUS_LABEL[activePopup.status]} 팝업 「${activePopup.title}」`
              : loading ? " · 불러오는 중…" : " · 등록된 팝업 없음"}
          </p>
        </div>
        <Link to="/seller/popups/new" className="text-xs px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90">
          + 새 팝업 등록
        </Link>
      </div>

      {/* KPI 카드 — 대표 팝업 기준 실데이터 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, diff }) => (
          <div key={label} className="bg-card border border-border rounded-sm p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><Icon size={13} /> {label}</div>
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{diff}</div>
          </div>
        ))}
      </div>

      {/* 알림/처리 필요 */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">처리가 필요한 항목</span>
          </div>
          <ul className="divide-y divide-border">
            {rejectedPopups.map((p) => {
              const suspended = isSuspended(p.status, p.rejectReason);
              return (
                <li key={p.id} className="px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">
                      「{p.title}」 {suspended ? "게시중지" : "심사 반려"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p.rejectReason ?? "사유 미기재"}
                    </div>
                  </div>
                  <Link to="/seller/popups" className="text-xs text-accent shrink-0 flex items-center">
                    확인 <ArrowUpRight size={11} />
                  </Link>
                </li>
              );
            })}
            {rejectedPopups.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                {loading ? "불러오는 중…" : "처리할 항목이 없습니다."}
              </li>
            )}
          </ul>
        </div>

        {/* 내 팝업 현황 */}
        <div className="bg-card border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">내 팝업 게시 상태</span>
            <Link to="/seller/popups" className="text-xs text-accent">전체 보기</Link>
          </div>
          <ul className="divide-y divide-border">
            {popups.slice(0, 4).map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>
                  {isSuspended(p.status, p.rejectReason) ? "게시중지" : STATUS_LABEL[p.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {fmtPeriod(p)}{p.location ? ` · ${p.location}` : ""}
                  </div>
                </div>
              </li>
            ))}
            {popups.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                {loading ? "불러오는 중…" : "등록된 팝업이 없습니다. 새 팝업을 등록해 보세요."}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
