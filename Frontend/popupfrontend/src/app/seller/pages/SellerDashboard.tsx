// [역할] 주최자 센터 홈 대시보드 — 로그인한 사업자의 실데이터 요약.
// 내 팝업 목록(getMyPopups)을 기준으로 대표 팝업(진행중 우선)을 정하고,
// 그 팝업의 오늘 예약·방문(체크인)·현재 대기열을 슬롯/예약/통합보드 API로 집계한다.
// (기존 seller/data.ts 목업 의존 제거 — 이 화면은 전면 실연동)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowUpRight, AlertTriangle, Users, CalendarCheck, Store, FileClock, Inbox, TrendingUp, Percent } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from "recharts";
import {
  getMyPopups, getSlots, getPopupReservations, getQueueBoard, getToken, getMyNoticeInbox,
  getVisitorTrend, getConversionRate,
  type Popup, type PopupSlot, type ReservationDetail, type UnifiedEntry, type PopupStatusCode,
  type NoticeInboxItem, type DailyCount, type ConversionRate,
} from "../../lib/api";
import { isSuspended } from "../../lib/adminPopupMeta";

// 백엔드 PopupStatus → 화면 표기 (PopupList와 동일 규약)
// 7/30 — SUSPENDED 키 누락 보완. 빠져 있으면 게시중지 팝업의 배지 클래스가 undefined가 되어 민짜로 그려졌다
const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "게시중지",
};
const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
  SUSPENDED: "bg-orange-50 text-orange-500 border-orange-200",
};

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtPeriod = (p: Popup) =>
  p.startDate && p.endDate ? `${p.startDate.slice(0, 10)} ~ ${p.endDate.slice(5, 10)}` : "기간 미정";

export default function SellerDashboard() {
  const navigate = useNavigate();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [slots, setSlots] = useState<PopupSlot[]>([]);
  const [reservations, setReservations] = useState<ReservationDetail[]>([]);
  const [queue, setQueue] = useState<UnifiedEntry[]>([]);
  // 미확인 관리자 공지 (7/30) — "처리 필요" 목록이 반려 없을 때 텅 비어 보여서, 공지 수신함과 연결
  const [unreadNotices, setUnreadNotices] = useState<NoticeInboxItem[]>([]);
  // 7/31 — 성과 대시보드의 6종 중 2종만 홈으로 끌어온다 (매일 들어와서 볼 이유가 되는 지표).
  // 나머지 4종(연령·성별·요약·예약추이)은 「성과 대시보드」에서 보고, 여기서는 링크로 안내만.
  const [visitTrend, setVisitTrend] = useState<DailyCount[]>([]);
  const [conversion, setConversion] = useState<ConversionRate | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = toDateStr(new Date());

  // 화면 지표의 기준 팝업. 팝업을 여러 개 운영하면 자동 선택만으로는 원하는 팝업을 볼 수 없어
  // 상단 셀렉트로 직접 고르게 했다 (7/31). null이면 아래 기본 규칙을 따른다.
  const [pickedPopupId, setPickedPopupId] = useState<number | null>(null);

  // 기본값: 진행중(OPEN) 우선 → 오픈예정(BEFOR) → 그 외 첫 번째.
  // 고른 팝업이 목록에서 사라져도(삭제·권한 변경) 화면이 빈 채로 굳지 않게 기본값으로 되돌아간다.
  const activePopup = useMemo(() => {
    const picked = pickedPopupId != null ? popups.find((p) => p.id === pickedPopupId) : undefined;
    return (
      picked ??
      popups.find((p) => p.status === "OPEN") ??
      popups.find((p) => p.status === "BEFOR") ??
      popups[0] ??
      null
    );
  }, [popups, pickedPopupId]);

  // 1) 내 팝업 목록 + 미확인 관리자 공지
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    getMyPopups()
      .then(setPopups)
      .catch(() => setPopups([]))
      .finally(() => setLoading(false));
    // 관리자가 보낸 공지 중 안 읽은 것 — 처리 필요 목록에 합류 (실패해도 대시보드는 떠야 함)
    getMyNoticeInbox()
      .then((list) => setUnreadNotices(list.filter((n) => !n.read)))
      .catch(() => {});
  }, []);

  // 2) 대표 팝업의 슬롯·예약·대기열 (실패해도 나머지 지표는 표시)
  useEffect(() => {
    if (!activePopup) { setSlots([]); setReservations([]); setQueue([]); setVisitTrend([]); setConversion(null); return; }
    getSlots(activePopup.id).then(setSlots).catch(() => setSlots([]));
    getPopupReservations(activePopup.id).then(setReservations).catch(() => setReservations([]));
    getQueueBoard(activePopup.id).then((b) => setQueue(b.entries)).catch(() => setQueue([]));
    // 성과 요약 2종 (7/31) — 본인 팝업 전용 API라 실패(권한·미집계)해도 조용히 빈 상태 유지
    getVisitorTrend(activePopup.id, 7).then(setVisitTrend).catch(() => setVisitTrend([]));
    getConversionRate(activePopup.id).then(setConversion).catch(() => setConversion(null));
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

  // 7/31 — 홈 스파크라인용 추이 (visitor-trend 7일). 합계는 카드 헤드라인, 파형은 "매일 볼 이유"
  const sparkData = visitTrend.map((v) => ({ date: v.date.slice(5), visitors: v.visitorCount ?? 0 }));
  const sparkTotal = sparkData.reduce((s, d) => s + d.visitors, 0);

  // 7/30 — 카드 클릭 시 해당 업무 화면으로 바로 이동 (to 추가)
  const kpis = [
    {
      icon: Users, label: "오늘 방문자",
      value: `${todayVisitors.toLocaleString()}명`,
      diff: "QR 체크인 기준",
      to: "/seller/waiting",
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
      to: activePopup ? `/seller/reservations?popup=${activePopup.id}` : "/seller/reservations",
    },
    {
      icon: Store, label: "현재 대기열",
      value: `${waitingEntries.length}팀`,
      diff: `사전예약 ${waitingFromReservation} · 현장 ${waitingOnsite}`,
      to: "/seller/waiting",
    },
    {
      icon: FileClock, label: "심사 현황",
      value: `대기 ${pendingCount}건`,
      diff: rejectedPopups.length > 0 ? `반려 ${rejectedPopups.length}건 — 확인 필요` : "반려 없음",
      to: "/seller/popups",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayStr} 기준
            {activePopup
              ? ` · ${STATUS_LABEL[activePopup.status]} 팝업의 오늘 현황`
              : loading ? " · 불러오는 중…" : " · 등록된 팝업 없음"}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* 지표 기준 팝업 선택 (7/31) — 아래 KPI·성과 카드가 전부 이 팝업을 따른다.
              팝업이 하나뿐이면 고를 게 없으므로 숨긴다 */}
          {popups.length > 1 && (
            <select
              value={activePopup?.id ?? ""}
              onChange={(e) => setPickedPopupId(Number(e.target.value))}
              title="이 팝업 기준으로 아래 지표를 표시합니다"
              className="text-xs border border-border rounded-sm px-3 py-2 bg-card focus:outline-none focus:border-accent max-w-[240px]"
            >
              {popups.map((p) => (
                <option key={p.id} value={p.id}>
                  [{STATUS_LABEL[p.status]}] {p.title}
                </option>
              ))}
            </select>
          )}
          <Link to="/seller/popups/new" className="text-xs px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 whitespace-nowrap">
            + 새 팝업 등록
          </Link>
        </div>
      </div>

      {/* KPI 카드 — 대표 팝업 기준 실데이터. 카드를 누르면 해당 업무 화면으로 (7/30) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value, diff, to }) => (
          <Link
            key={label}
            to={to}
            className="group bg-card border border-border rounded-sm p-4 hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Icon size={13} /> {label}
              <ArrowUpRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 text-accent transition-opacity" />
            </div>
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{diff}</div>
          </Link>
        ))}
      </div>

      {/* 성과 요약 (7/31) — 성과 대시보드 6종 중 방문 추이·전환율만 홈으로. 카드 클릭 시 성과 대시보드로 */}
      {activePopup && (
        <div className="grid md:grid-cols-3 gap-3">
          <Link
            to="/seller/performance"
            className="group md:col-span-2 bg-card border border-border rounded-sm p-4 hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp size={13} /> 최근 7일 방문 추이
              <span className="text-[11px]">「{activePopup.title}」 · 체크인 기준</span>
              <ArrowUpRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 text-accent transition-opacity" />
            </div>
            <div className="flex items-end gap-4">
              <div className="shrink-0">
                <div className="text-xl font-semibold">{sparkTotal.toLocaleString()}명</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">7일 합계</div>
              </div>
              {/* 축 없는 스파크라인 — 상세 눈금은 성과 대시보드가 담당 */}
              <div className="flex-1 h-14 min-w-0">
                {sparkData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
                    아직 집계된 방문 데이터가 없습니다
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id="gHomeSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E85D3C" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#E85D3C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      {/* 8/3 — XAxis 없이는 툴팁 라벨이 배열 인덱스(0~6)로 나와 "0 방문"처럼 보였다.
                          date(MM-DD)를 라벨로 쓰되 눈금은 숨겨 스파크라인 모양은 유지 */}
                      <XAxis dataKey="date" hide />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 4, padding: "4px 8px" }}
                        labelFormatter={(l) => `${l} 방문`}
                        formatter={(v) => [`${v}명`, "방문자"]}
                      />
                      <Area type="monotone" dataKey="visitors" stroke="#E85D3C" strokeWidth={2} fill="url(#gHomeSpark)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Link>
          <Link
            to="/seller/performance"
            className="group bg-card border border-border rounded-sm p-4 hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Percent size={13} /> 예약 전환율
              <ArrowUpRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 text-accent transition-opacity" />
            </div>
            <div className="text-xl font-semibold">{(conversion?.conversionRate ?? 0).toFixed(1)}%</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {conversion
                ? `클릭 ${conversion.clickCount.toLocaleString()} → 예약 ${conversion.reservationCount.toLocaleString()}`
                : "클릭·예약 데이터 없음"}
            </div>
          </Link>
        </div>
      )}

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
                  {/* 7/30 — 목록이 아니라 그 팝업의 상세로 직행 (사유 전문·재등록 버튼이 있는 곳) */}
                  <Link to={`/seller/popups/${p.id}`} className="text-xs text-accent shrink-0 flex items-center">
                    확인 <ArrowUpRight size={11} />
                  </Link>
                </li>
              );
            })}
            {/* 7/30 — 미확인 관리자 공지도 처리 필요 항목이다 (반려만 보다가 공지를 놓치는 문제) */}
            {unreadNotices.slice(0, 3).map((n) => (
              <li key={n.recipientId} className="px-4 py-3 flex items-start gap-3">
                <Inbox size={15} className="text-accent shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">미확인 공지 「{n.title}」</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    관리자 발송 · {n.sentAt.slice(5, 16).replace("T", " ")}
                  </div>
                </div>
                <Link to="/seller/admin-notices" className="text-xs text-accent shrink-0 flex items-center">
                  읽기 <ArrowUpRight size={11} />
                </Link>
              </li>
            ))}
            {unreadNotices.length > 3 && (
              <li className="px-4 py-2 text-center">
                <Link to="/seller/admin-notices" className="text-[11px] text-accent underline underline-offset-2">
                  미확인 공지 {unreadNotices.length}건 전체 보기 →
                </Link>
              </li>
            )}
            {rejectedPopups.length === 0 && unreadNotices.length === 0 && (
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
            {/* 7/30 — 행 클릭 시 그 팝업의 상세페이지로 (제목만 링크가 아니라 행 전체) */}
            {popups.slice(0, 4).map((p) => (
              <li
                key={p.id}
                onClick={() => navigate(`/seller/popups/${p.id}`)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/40 transition-colors"
              >
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>
                  {isSuspended(p.status, p.rejectReason) ? "게시중지" : STATUS_LABEL[p.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {fmtPeriod(p)}{p.location ? ` · ${p.location}` : ""}
                  </div>
                </div>
                <ArrowUpRight size={12} className="shrink-0 text-muted-foreground" />
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
