import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  getAdminDashboard, AdminDashboard as Dashboard,
  getPopupRanking, PopupVisitorRanking,
  getRevenueTrend, RevenueTrend,
} from "../../lib/api";

// 플랫폼 종합 성과 — 7/28 실데이터 연동
// 방문자 랭킹(/api/admin/stats/popup-ranking) · 매출 추이(/api/admin/stats/revenue) · 요약(dashboard BFF)

type Period = "DAILY30" | "MONTHLY12";

export default function PlatformStats() {
  const [period, setPeriod] = useState<Period>("DAILY30");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [ranking, setRanking] = useState<PopupVisitorRanking[]>([]);
  const [revenue, setRevenue] = useState<RevenueTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 요약·랭킹은 1회, 매출은 기간 변경 시 재조회
  useEffect(() => {
    Promise.all([getAdminDashboard(), getPopupRanking()])
      .then(([d, r]) => { setDash(d); setRanking(r); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "통계를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const [unit, amount] = period === "DAILY30" ? (["DAILY", 30] as const) : (["MONTHLY", 12] as const);
    getRevenueTrend(unit, amount)
      .then(setRevenue)
      .catch(() => setRevenue([]));
  }, [period]);

  const totalCheckin = ranking.reduce((s, r) => s + r.visitorCount, 0);
  const revenueSum = revenue.reduce((s, r) => s + Number(r.totalAmount), 0);
  const revenueChart = revenue.map((r) => ({
    period: period === "DAILY30" ? r.period.slice(5) : r.period, // 일별은 MM-DD
    amount: Math.round(Number(r.totalAmount) / 10000), // 만원 단위
  }));
  const top5 = ranking.slice(0, 5).map((r) => ({ name: r.popupTitle, visitors: r.visitorCount }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">플랫폼 종합 성과 대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">전체 팝업 방문(체크인)·매출(계약금) 실데이터 집계</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="text-xs border border-border rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-accent"
        >
          <option value="DAILY30">매출: 최근 30일 (일별)</option>
          <option value="MONTHLY12">매출: 최근 12개월 (월별)</option>
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-14">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 요약 지표 — dashboard BFF + 랭킹·매출 합산 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: "누적 체크인 방문", value: `${totalCheckin.toLocaleString()}명`, sub: `랭킹 집계 팝업 ${ranking.length}개` },
              { label: period === "DAILY30" ? "최근 30일 매출" : "최근 12개월 매출", value: `${(revenueSum / 10000).toLocaleString()}만원`, sub: "계약금 등록 기준" },
              { label: "게시중 / 심사 대기", value: dash ? `${dash.openPopupCount} / ${dash.pendingPopupCount}` : "—", sub: "팝업 현황" },
              { label: "누적 소비자 회원", value: dash ? `${dash.totalCustomerCount.toLocaleString()}명` : "—", sub: `활성 파트너 ${dash?.activePartnerCount ?? "—"}사` },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-border rounded-sm p-4">
                <div className="text-xs text-muted-foreground mb-1.5">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* 매출 추이 */}
          <div className="bg-white border border-border rounded-sm p-4">
            <div className="text-sm font-semibold mb-4">
              매출 추이 (계약금 · {period === "DAILY30" ? "최근 30일" : "최근 12개월"})
            </div>
            <div className="h-64">
              {revenueChart.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  집계된 매출 데이터가 없습니다. (팝업 계약금 등록 시 집계)
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChart} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2F6BFF" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#2F6BFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${Number(v).toLocaleString()}만원`} />
                    <Area type="monotone" dataKey="amount" name="매출(만원)" stroke="#2F6BFF" strokeWidth={2} fill="url(#gRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 방문자 랭킹 */}
          <div className="grid lg:grid-cols-2 gap-3 items-start">
            <div className="bg-white border border-border rounded-sm p-4">
              <div className="text-sm font-semibold mb-4">팝업별 방문자 TOP 5 (누적 체크인)</div>
              <div className="h-60">
                {top5.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    체크인 데이터가 없습니다.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top5} layout="vertical" margin={{ top: 0, right: 24, left: 24, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${Number(v).toLocaleString()}명`} />
                      <Bar dataKey="visitors" fill="#E85D3C" radius={[0, 3, 3, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-border rounded-sm">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold">방문자 랭킹 전체</div>
              <ul className="divide-y divide-border">
                {ranking.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">체크인 데이터가 없습니다.</li>
                )}
                {ranking.slice(0, 8).map((r) => (
                  <li key={r.popupId} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{r.rank}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{r.popupTitle}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{r.companyName}</div>
                    </div>
                    <div className="text-[13px] font-semibold shrink-0">{r.visitorCount.toLocaleString()}명</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
