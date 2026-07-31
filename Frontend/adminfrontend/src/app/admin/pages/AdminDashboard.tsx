import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, ShieldCheck, Handshake, Headphones, Activity, Store, Users, MessageSquare } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { getAdminDashboard, AdminDashboard as Dashboard } from "../../lib/api";

// 관리자 대시보드 — GET /api/admin/dashboard 실데이터 (방문자 추이·승인 대기·CS·회원 집계)

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "대시보드를 불러오지 못했습니다."));
  }, []);

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

      <div className="grid lg:grid-cols-3 gap-3 items-start">
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

        {/* 매출 추이 (계약금 기준) */}
        <div className="bg-card border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">매출 추이 (계약금)</span>
            <Link to="/admin/stats" className="text-xs text-accent">상세</Link>
          </div>
          <ul className="divide-y divide-border">
            {(data?.revenueTrend ?? []).slice(-6).map((r) => (
              <li key={r.period} className="px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{r.period}</span>
                <span className="font-semibold">{Number(r.totalAmount).toLocaleString()}원</span>
              </li>
            ))}
            {data && data.revenueTrend.length === 0 && (
              <li className="px-4 py-8 text-center text-xs text-muted-foreground">계약 매출 데이터가 없습니다.<br />(팝업 계약금 등록 시 집계)</li>
            )}
            {!data && !error && <li className="px-4 py-8 text-center text-xs text-muted-foreground">불러오는 중…</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
