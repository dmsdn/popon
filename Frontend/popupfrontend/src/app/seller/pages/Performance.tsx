import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { Loader2 } from "lucide-react";
import {
  getMyPopups, getVisitorTrend, getReservationTrend, getVisitorSummary,
  getVisitorAgeStats, getVisitorGenderStats, getConversionRate,
  Popup, DailyCount, VisitorSummary, ConversionRate,
} from "../../lib/api";

// 내 팝업 성과 대시보드 — 7/27 방문자 통계 API 6종(jmy) 실연동
// 방문자 = 체크인(CHECKED_IN) 기준, 전환율 = 클릭로그 대비 예약

const COLORS = ["#E85D3C", "#2F6BFF", "#12B76A", "#F2B01E", "#8B5CF6", "#94A3B8"];

export default function Performance() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [visitTrend, setVisitTrend] = useState<DailyCount[]>([]);
  const [resvTrend, setResvTrend] = useState<DailyCount[]>([]);
  const [summary, setSummary] = useState<VisitorSummary | null>(null);
  const [ageStats, setAgeStats] = useState<Record<string, number>>({});
  const [genderStats, setGenderStats] = useState<Record<string, number>>({});
  const [conversion, setConversion] = useState<ConversionRate | null>(null);

  // 내 팝업 목록 → 첫 팝업 자동 선택 (게시 상태 우선)
  useEffect(() => {
    getMyPopups()
      .then((list) => {
        setPopups(list);
        const first = list.find((p) => p.status === "OPEN") ?? list.find((p) => p.status === "BEFOR") ?? list[0];
        if (first) setPopupId(first.id);
        else setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."); setLoading(false); });
  }, []);

  // 선택 팝업의 통계 6종 — 서로 독립이므로 동시 요청
  useEffect(() => {
    if (popupId == null) return;
    setLoading(true);
    setError("");
    Promise.all([
      getVisitorTrend(popupId, 7),
      getReservationTrend(popupId, 7),
      getVisitorSummary(popupId),
      getVisitorAgeStats(popupId),
      getVisitorGenderStats(popupId),
      getConversionRate(popupId),
    ])
      .then(([vt, rt, sm, age, gender, conv]) => {
        setVisitTrend(vt);
        setResvTrend(rt);
        setSummary(sm);
        setAgeStats(age);
        setGenderStats(gender);
        setConversion(conv);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "통계를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [popupId]);

  const selected = popups.find((p) => p.id === popupId) ?? null;

  // 차트용 변환 — 날짜는 MM-DD로, 두 추이를 날짜 기준으로 병합
  const trendChart = visitTrend.map((v) => ({
    date: v.date.slice(5),
    visitors: v.visitorCount ?? 0,
    reservations: resvTrend.find((r) => r.date === v.date)?.reservationCount ?? 0,
  }));

  // 연령/성별 — 0건 항목은 파이에서 제외 (전부 0이면 빈 상태 표시)
  const ageData = Object.entries(ageStats).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const genderData = Object.entries(genderStats).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const totalVisitorsInTrend = trendChart.reduce((s, d) => s + d.visitors, 0);
  const totalReservationsInTrend = trendChart.reduce((s, d) => s + d.reservations, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">내 팝업 성과 대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            방문자(체크인)·예약·전환율 — 최근 7일 기준
          </p>
        </div>
        {/* 팝업 선택 */}
        <select
          value={popupId ?? ""}
          onChange={(e) => setPopupId(Number(e.target.value))}
          className="text-xs border border-border rounded-sm px-3 py-2 bg-white focus:outline-none focus:border-accent min-w-[220px]"
        >
          {popups.length === 0 && <option value="">등록된 팝업 없음</option>}
          {popups.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {loading && (
        <div className="text-center text-xs text-muted-foreground py-14">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 통계 불러오는 중…
        </div>
      )}

      {!loading && !error && popups.length === 0 && (
        <div className="bg-white border border-border rounded-sm px-4 py-14 text-center text-xs text-muted-foreground">
          등록된 팝업이 없습니다. 팝업 등록 후 성과를 확인할 수 있습니다.
        </div>
      )}

      {!loading && !error && selected && (
        <>
          {/* 핵심 지표 — visitor-summary + conversion-rate */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: "누적 방문자",
                value: `${(summary?.totalVisitors ?? 0).toLocaleString()}명`,
                sub: `일평균 ${(summary?.dailyAverage ?? 0).toLocaleString()}명`,
              },
              {
                label: "최근 7일 방문",
                value: `${totalVisitorsInTrend.toLocaleString()}명`,
                sub: `예약 ${totalReservationsInTrend.toLocaleString()}건`,
              },
              {
                label: "예약 전환율",
                value: `${(conversion?.conversionRate ?? 0).toFixed(1)}%`,
                sub: `클릭 ${(conversion?.clickCount ?? 0).toLocaleString()} → 예약 ${(conversion?.reservationCount ?? 0).toLocaleString()}`,
              },
              {
                label: "팝업 상태",
                value: selected.status === "OPEN" ? "진행중" : selected.status === "BEFOR" ? "오픈예정" : selected.status === "CLOSED" ? "종료" : selected.status === "PENDING" ? "심사 대기" : "반려",
                sub: `${selected.startDate?.slice(0, 10) ?? "-"} ~ ${selected.endDate?.slice(0, 10) ?? "-"}`,
              },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-border rounded-sm p-4">
                <div className="text-xs text-muted-foreground mb-1.5">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* 방문자·예약 추이 — visitor-trend + reservation-trend 병합 */}
          <div className="bg-white border border-border rounded-sm p-4">
            <div className="text-sm font-semibold mb-4">일별 방문자·예약 추이 (최근 7일)</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gVisit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E85D3C" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#E85D3C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                  <Area type="monotone" dataKey="visitors" name="방문자(명)" stroke="#E85D3C" strokeWidth={2} fill="url(#gVisit)" />
                  <Area type="monotone" dataKey="reservations" name="예약(건)" stroke="#2F6BFF" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            {/* 연령 분포 — visitor-age-stats */}
            <div className="bg-white border border-border rounded-sm p-4">
              <div className="text-sm font-semibold mb-2">방문객 연령 분포</div>
              {ageData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">
                  체크인 방문자가 없어 집계할 데이터가 없습니다.
                </div>
              ) : (
                <>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ageData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                          {ageData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${v}명`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
                    {ageData.map((d, i) => (
                      <span key={d.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /> {d.name} {d.value}명
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 성별 분포 — visitor-gender-stats (기존 목업 '방문 경로' 대체) */}
            <div className="bg-white border border-border rounded-sm p-4">
              <div className="text-sm font-semibold mb-2">방문객 성별 분포</div>
              {genderData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-xs text-muted-foreground">
                  체크인 방문자가 없어 집계할 데이터가 없습니다.
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${v}명`} />
                      <Bar dataKey="value" fill="#E85D3C" radius={[0, 3, 3, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 예약 추이 — reservation-trend */}
            <div className="bg-white border border-border rounded-sm p-4">
              <div className="text-sm font-semibold mb-2">일별 예약 건수 (취소 제외)</div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                    <Bar dataKey="reservations" name="예약(건)" fill="#2F6BFF" radius={[3, 3, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
