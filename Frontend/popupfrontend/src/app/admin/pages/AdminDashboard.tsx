import { Link } from "react-router";
import { ArrowUpRight, ShieldCheck, Handshake, Headphones, Activity, Store, Users } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const WEEKLY = [
  { date: "07-09", visitors: 18200, popups: 42 },
  { date: "07-10", visitors: 24100, popups: 44 },
  { date: "07-11", visitors: 31800, popups: 45 },
  { date: "07-12", visitors: 33400, popups: 45 },
  { date: "07-13", visitors: 21600, popups: 46 },
  { date: "07-14", visitors: 23900, popups: 47 },
  { date: "07-15", visitors: 11300, popups: 48 },
];

const PENDING = [
  { icon: ShieldCheck, label: "팝업 심사 대기", value: 6, to: "/admin/review", color: "text-accent" },
  { icon: Headphones, label: "미처리 문의", value: 12, to: "/admin/cs", color: "text-amber-600" },
  { icon: Activity, label: "후기 신고 접수", value: 3, to: "/admin/cs", color: "text-red-500" },
];

const RECENT_CS = [
  { time: "10:42", type: "예약", text: "QR코드가 열리지 않아요 (소비자 · 무너 팝업)", state: "미배정" },
  { time: "10:15", type: "정산", text: "6월 정산서 세부 항목 문의 (주최자 · 레코드랩)", state: "처리중" },
  { time: "09:31", type: "신고", text: "후기 부적절 사진 신고 3건 접수 (자동)", state: "미처리" },
];

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">관리자 대시보드</h1>
        <p className="text-xs text-muted-foreground mt-0.5">승인 대기·CS·플랫폼 전체 현황 요약</p>
      </div>

      {/* 승인 대기 요약 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {PENDING.map(({ icon: Icon, label, value, to, color }) => (
          <Link key={label} to={to} className="bg-white border border-border rounded-sm p-4 hover:border-accent/50 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon size={13} /> {label}</span>
              <ArrowUpRight size={13} className="text-muted-foreground group-hover:text-accent" />
            </div>
            <div className={`text-2xl font-semibold ${color}`}>{value}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-3 items-start">
        {/* 플랫폼 추이 */}
        <div className="bg-white border border-border rounded-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">플랫폼 전체 방문자 추이 (최근 7일)</span>
            <Link to="/admin/stats" className="text-xs text-accent">상세 통계</Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEKLY} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAdm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E85D3C" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#E85D3C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                <Area type="monotone" dataKey="visitors" name="방문자" stroke="#E85D3C" strokeWidth={2} fill="url(#gAdm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            {[
              { icon: Store, label: "게시중 팝업", value: "48개" },
              { icon: Users, label: "누적 회원", value: "84,210명" },
              { icon: Handshake, label: "활성 파트너", value: "126사" },
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

        {/* 최근 CS */}
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">최근 접수 CS</span>
            <Link to="/admin/cs" className="text-xs text-accent">전체 보기</Link>
          </div>
          <ul className="divide-y divide-border">
            {RECENT_CS.map((c) => (
              <li key={c.time + c.text} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.time}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">{c.type}</span>
                  <span className={`ml-auto text-[10px] ${c.state === "처리중" ? "text-blue-600" : "text-red-500"}`}>{c.state}</span>
                </div>
                <div className="text-xs leading-snug">{c.text}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
