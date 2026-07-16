import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, BarChart,
} from "recharts";

const MONTHLY = [
  { month: "2월", visitors: 214, revenue: 5.2, conversion: 18.1 },
  { month: "3월", visitors: 305, revenue: 7.8, conversion: 19.4 },
  { month: "4월", visitors: 388, revenue: 10.1, conversion: 20.2 },
  { month: "5월", visitors: 452, revenue: 12.6, conversion: 21.8 },
  { month: "6월", visitors: 517, revenue: 14.9, conversion: 22.5 },
  { month: "7월", visitors: 289, revenue: 8.4, conversion: 23.1 },
];

const TOP_POPUPS = [
  { name: "무너의 여름방학", visitors: 12480, revenue: 4322 },
  { name: "선셋 무드 향수전", visitors: 9840, revenue: 3810 },
  { name: "빈티지 바이닐 마켓", visitors: 8930, revenue: 295 },
  { name: "어반 가드닝 위크", visitors: 7420, revenue: 2110 },
  { name: "K-디저트 페어", visitors: 6980, revenue: 3450 },
];

export default function PlatformStats() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">플랫폼 종합 성과 대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">전체 팝업 대상 기간별 방문자·매출·전환율 집계 (일 배치 기준)</p>
        </div>
        <select className="text-xs border border-border rounded-sm px-3 py-2 bg-white focus:outline-none">
          <option>최근 6개월</option><option>최근 12개월</option><option>올해</option>
        </select>
      </div>

      {/* 요약 지표 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "월간 방문자 (7월)", value: "28.9만명", sub: "전월 대비 진행률 56%" },
          { label: "월간 거래액 (7월)", value: "8.4억원", sub: "수수료 매출 6,720만원" },
          { label: "평균 예약 전환율", value: "23.1%", sub: "+0.6%p 전월 대비" },
          { label: "게시중 / 심사 대기", value: "48 / 6", sub: "이번 주 신규 등록 9건" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-border rounded-sm p-4">
            <div className="text-xs text-muted-foreground mb-1.5">{k.label}</div>
            <div className="text-xl font-semibold">{k.value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* 월별 통합 차트 */}
      <div className="bg-white border border-border rounded-sm p-4">
        <div className="text-sm font-semibold mb-4">월별 방문자·거래액·전환율</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={MONTHLY} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="l" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="l" dataKey="visitors" name="방문자(천명)" fill="#E85D3C" radius={[3, 3, 0, 0]} barSize={22} />
              <Bar yAxisId="l" dataKey="revenue" name="거래액(억원)" fill="#2F6BFF" radius={[3, 3, 0, 0]} barSize={22} />
              <Line yAxisId="r" type="monotone" dataKey="conversion" name="전환율(%)" stroke="#12B76A" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 팝업별 순위 */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-white border border-border rounded-sm p-4">
          <div className="text-sm font-semibold mb-4">팝업별 방문자 TOP 5 (이번 달)</div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TOP_POPUPS} layout="vertical" margin={{ top: 0, right: 24, left: 24, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${Number(v).toLocaleString()}명`} />
                <Bar dataKey="visitors" fill="#E85D3C" radius={[0, 3, 3, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold">팝업별 매출 순위</div>
          <ul className="divide-y divide-border">
            {TOP_POPUPS.slice().sort((a, b) => b.revenue - a.revenue).map((p, i) => (
              <li key={p.name} className="px-4 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                <div className="flex-1 text-[13px] font-medium truncate">{p.name}</div>
                <div className="text-[13px] font-semibold shrink-0">{p.revenue.toLocaleString()}만원</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
