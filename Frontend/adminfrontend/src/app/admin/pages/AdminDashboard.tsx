import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ShieldCheck, Handshake, Headphones, Activity, Store, Users, MessageSquare, QrCode, Flag, MapPin } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  getAdminDashboard, AdminDashboard as Dashboard,
  getPopups, getPopupEventLog, getAdminReports, getRegions,
  type Popup, type ReportItem, type Region,
} from "../../lib/api";

// 관리자 대시보드 — GET /api/admin/dashboard 실데이터 (방문자 추이·승인 대기·CS·회원 집계)
// 7/31 실시간 운영 지표 3종 추가: 오늘 체크인(이벤트 로그 집계)·신고 처리 현황·지역별 팝업 분포

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  // 7/31 운영 지표 — 각각 독립 로드. 하나가 실패해도 나머지는 떠야 하므로 상태를 분리한다
  const [popups, setPopups] = useState<Popup[]>([]);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  // 오늘 체크인 — null=집계 중, {resv, walkin}=완료
  const [todayCheckin, setTodayCheckin] = useState<{ resv: number; walkin: number } | null>(null);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "대시보드를 불러오지 못했습니다."));
    getPopups().then(setPopups).catch(() => {});
    getAdminReports().then(setReports).catch(() => setReports([]));
    getRegions().then(setRegions).catch(() => {});
  }, []);

  // 오늘 플랫폼 전체 체크인 — 전용 집계 API가 없어 이벤트 로그(감사 원장)를 팝업별로 모아 센다.
  // 체크인은 두 경로로 기록된다: 예약 입장 CHECKED_IN, 현장 웨이팅 입장 ENTERED (백엔드 이벤트 로그 참고).
  // 오늘 입장이 있을 수 있는 건 게시중(OPEN) 팝업뿐이라 그만큼만 요청한다 — 팝업 수가 수십 개 규모라 감당된다.
  useEffect(() => {
    const open = popups.filter((p) => p.status === "OPEN");
    if (popups.length === 0) return;
    if (open.length === 0) { setTodayCheckin({ resv: 0, walkin: 0 }); return; }
    const today = toDateStr(new Date());
    Promise.allSettled(open.map((p) => getPopupEventLog(p.id)))
      .then((results) => {
        let resv = 0, walkin = 0;
        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          for (const ev of r.value) {
            if (!ev.createdAt.startsWith(today)) continue;
            if (ev.entityType === "RESERVATION" && ev.eventType === "CHECKED_IN") resv++;
            if (ev.entityType === "WAITING" && ev.eventType === "ENTERED") walkin++;
          }
        }
        setTodayCheckin({ resv, walkin });
      });
  }, [popups]);

  // 신고 3상태 집계 — PENDING(접수)·REJECTED(반려=후기 유지)·HIDDEN(수용=후기 가림)
  const reportCounts = {
    PENDING: (reports ?? []).filter((r) => r.status === "PENDING").length,
    REJECTED: (reports ?? []).filter((r) => r.status === "REJECTED").length,
    HIDDEN: (reports ?? []).filter((r) => r.status === "HIDDEN").length,
  };
  const reportTotal = reportCounts.PENDING + reportCounts.REJECTED + reportCounts.HIDDEN;

  // 지역별 팝업 분포 — region 마스터 전체를 기준으로 세서, 팝업이 0개인 지역도 그대로 보인다
  // (공급이 빈 지역 = 유치 영업이 필요한 지역이라는 운영 신호)
  const regionDist = regions
    .map((r) => ({
      name: r.name,
      total: popups.filter((p) => p.regionName === r.name).length,
      open: popups.filter((p) => p.regionName === r.name && p.status === "OPEN").length,
    }))
    .sort((a, b) => b.total - a.total);
  const regionMax = Math.max(1, ...regionDist.map((d) => d.total));
  const unassigned = popups.filter((p) => !p.regionName).length;

  const pendingCards = [
    { icon: ShieldCheck, label: "팝업 심사 대기", value: data?.pendingPopupCount, to: "/admin/popups", color: "text-accent" },
    { icon: Headphones, label: "미처리 문의 (소비자 CS)", value: data?.pendingCsCount, to: "/admin/cs", color: "text-amber-600" },
    { icon: MessageSquare, label: "미처리 문의 (주최자)", value: data?.pendingInquiryCount, to: "/admin/cs", color: "text-blue-600" },
    { icon: Activity, label: "후기 신고 접수", value: data?.pendingReportCount, to: "/admin/cs", color: "text-red-500" },
  ];

  // 방문자 추이 → 차트 데이터 (MM-DD 표기)
  const chart = (data?.visitTrend ?? []).map((v) => ({ date: v.date.slice(5), visitors: v.count }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">관리자 대시보드</h1>
        <p className="text-xs text-muted-foreground mt-0.5">승인 대기·CS·플랫폼 전체 현황 요약</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 승인 대기 요약 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {pendingCards.map(({ icon: Icon, label, value, to, color }) => (
          <Link key={label} to={to} className="bg-card border border-border rounded-sm p-4 hover:border-accent/50 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon size={13} /> {label}</span>
              <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-accent" />
            </div>
            <div className={`text-2xl font-semibold ${color}`}>
              {value ?? "—"}<span className="text-sm font-normal text-muted-foreground ml-1">건</span>
            </div>
          </Link>
        ))}
      </div>

      {/* 7/31 — items-start 제거. 그리드 기본값(stretch)이라 같은 줄 카드가 같은 높이로
          늘어나 아랫변이 직사각형으로 맞는다. 그전에는 내용 길이대로 높이가 달라 들쭉날쭉했다. */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* 플랫폼 방문자 추이 (실데이터) */}
        <div className="bg-card border border-border rounded-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">플랫폼 전체 방문자 추이 (최근 {chart.length || 7}일)</span>
            <Link to="/admin/stats" className="text-xs text-accent">상세 통계</Link>
          </div>
          <div className="h-56">
            {chart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                집계된 방문 데이터가 없습니다. (앱 접속 시 자동 집계)
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gAdm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E85D3C" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#E85D3C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                  <Area type="monotone" dataKey="visitors" name="방문자" stroke="#E85D3C" strokeWidth={2} fill="url(#gAdm)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {[
              { icon: Store, label: "게시중 팝업", value: data ? `${data.openPopupCount}개` : "—" },
              { icon: Users, label: "누적 회원", value: data ? `${data.totalCustomerCount.toLocaleString()}명` : "—" },
              { icon: Handshake, label: "활성 파트너", value: data ? `${data.activePartnerCount}사` : "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-sm bg-secondary flex items-center justify-center"><Icon size={14} className="text-muted-foreground" /></div>
                <div>
                  <div className="text-[11px] text-muted-foreground">{label}</div>
                  <div className="text-sm font-semibold">{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 8/3 — 매출 추이(계약금) 카드 제거. 빈 자리는 오늘 체크인 카드를 올려 채운다 —
            4 KPI / 차트(2)+체크인(1) / 신고+지역(2분할)로 줄마다 직사각형이 맞는다 */}
        {/* 오늘 체크인 — 팝업 상세의 이벤트 로그(감사 원장)를 플랫폼 단위로 합산 */}
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <QrCode size={13} /> 오늘 체크인 (플랫폼 전체)
          </div>
          <div className="text-2xl font-semibold">
            {todayCheckin === null ? "—" : `${(todayCheckin.resv + todayCheckin.walkin).toLocaleString()}`}
            <span className="text-sm font-normal text-muted-foreground ml-1">건</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {todayCheckin === null
              ? "게시중 팝업의 이벤트 로그 집계 중…"
              : `예약 입장 ${todayCheckin.resv} · 현장 입장 ${todayCheckin.walkin}`}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
            예약·웨이팅 상태 변화가 자동 기록되는 이벤트 로그 기준. 팝업별 원장은 각 팝업 상세에서 볼 수 있습니다.
          </p>
        </div>
      </div>

      {/* 실시간 운영 지표 (7/31) — 신고·지역 마스터 집계. 8/3 — 2분할로 아랫줄 직사각형 유지 */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* 신고 처리 현황 — 접수/반려/수용 3상태 비율 */}
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><Flag size={13} /> 후기 신고 처리 현황</span>
            <Link to="/admin/cs" className="text-xs text-accent">처리하기</Link>
          </div>
          <div className="text-2xl font-semibold">
            {reports === null ? "—" : reportTotal.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">건 누적</span>
          </div>
          {/* 3상태 비율 바 — 접수(빨강)가 커지면 한눈에 보인다 */}
          {reportTotal > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-secondary">
              <div className="bg-red-400" style={{ width: `${(reportCounts.PENDING / reportTotal) * 100}%` }} />
              <div className="bg-slate-300" style={{ width: `${(reportCounts.REJECTED / reportTotal) * 100}%` }} />
              <div className="bg-emerald-400" style={{ width: `${(reportCounts.HIDDEN / reportTotal) * 100}%` }} />
            </div>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> 접수 {reportCounts.PENDING}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" /> 반려(유지) {reportCounts.REJECTED}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 수용(가림) {reportCounts.HIDDEN}</span>
          </div>
          {reports !== null && reportTotal === 0 && (
            <p className="text-[11px] text-muted-foreground mt-3">접수된 신고가 없습니다.</p>
          )}
        </div>

        {/* 지역별 팝업 분포 — region 마스터 기준. 0개 지역도 보여서 공급 공백이 드러난다 */}
        <div className="bg-card border border-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin size={13} /> 지역별 팝업 분포</span>
            <Link to="/admin/masters" className="text-xs text-accent">지역 관리</Link>
          </div>
          <ul className="flex flex-col gap-2">
            {regionDist.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 text-muted-foreground">{d.name}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-accent/70 rounded-full" style={{ width: `${(d.total / regionMax) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right tabular-nums">
                  {d.total}개<span className="text-muted-foreground"> · {d.open}게시</span>
                </span>
              </li>
            ))}
            {regionDist.length === 0 && (
              <li className="py-4 text-center text-xs text-muted-foreground">지역 마스터를 불러오는 중…</li>
            )}
          </ul>
          {unassigned > 0 && (
            <p className="text-[11px] text-muted-foreground mt-2.5 pt-2.5 border-t border-border">
              지역 미지정 팝업 {unassigned}개는 분포에서 제외됨
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
