import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { DAILY_STATS } from "../data";

const AGE_DATA = [
  { name: "10대", value: 14 },
  { name: "20대", value: 46 },
  { name: "30대", value: 27 },
  { name: "40대+", value: 13 },
];
const ROUTE_DATA = [
  { name: "인스타그램", value: 41 },
  { name: "팝업온 앱", value: 28 },
  { name: "지인 추천", value: 17 },
  { name: "현장 유입", value: 14 },
];
const COLORS = ["#E85D3C", "#2F6BFF", "#12B76A", "#F2B01E"];

export default function Performance() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">내 팝업 성과 대시보드</h1>
        <p className="text-xs text-muted-foreground mt-0.5">「무너의 여름방학 팝업」 · 07-08 ~ 07-14 (최근 7일)</p>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "누적 방문자", value: "12,480명", sub: "일평균 1,297명" },
          { label: "누적 매출", value: "4,322만원", sub: "객단가 34,600원" },
          { label: "예약 전환율", value: "23.4%", sub: "노출 대비 예약" },
          { label: "재방문 의향", value: "4.6 / 5.0", sub: "현장 설문 812건" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-border rounded-sm p-4">
            <div className="text-xs text-muted-foreground mb-1.5">{k.label}</div>
            <div className="text-xl font-semibold">{k.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 방문자·매출 추이 */}
      <div className="bg-white border border-border rounded-sm p-4">
        <div className="text-sm font-semibold mb-4">일별 방문자·매출 추이</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={DAILY_STATS} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gVisit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E85D3C" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#E85D3C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              <Area type="monotone" dataKey="visitors" name="방문자(명)" stroke="#E85D3C" strokeWidth={2} fill="url(#gVisit)" />
              <Area type="monotone" dataKey="revenue" name="매출(만원)" stroke="#2F6BFF" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* 연령 분포 */}
        <div className="bg-white border border-border rounded-sm p-4">
          <div className="text-sm font-semibold mb-2">방문객 연령 분포</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={AGE_DATA} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {AGE_DATA.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
            {AGE_DATA.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} /> {d.name} {d.value}%
              </span>
            ))}
          </div>
        </div>

        {/* 방문 경로 */}
        <div className="bg-white border border-border rounded-sm p-4">
          <div className="text-sm font-semibold mb-2">방문 경로</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ROUTE_DATA} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${v}%`} />
                <Bar dataKey="value" fill="#E85D3C" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 예약 추이 */}
        <div className="bg-white border border-border rounded-sm p-4">
          <div className="text-sm font-semibold mb-2">일별 예약 건수</div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAILY_STATS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                <Bar dataKey="reservations" name="예약(건)" fill="#2F6BFF" radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
