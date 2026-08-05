import { useEffect, useState } from "react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar,
} from "recharts";
import { Loader2, ArrowUpRight, ChevronDown, ChevronUp, Star } from "lucide-react";
import { Link, useNavigate } from "react-router";
import {
  getAdminDashboard, AdminDashboard as Dashboard,
  getPopupRanking, PopupVisitorRanking,
  getPopups, type Popup,
} from "../../lib/api";

// 플랫폼 종합 성과 — 7/28 실데이터 연동
// 방문자 랭킹(/api/admin/stats/popup-ranking) · 요약(dashboard BFF)
// 7/31 — 브랜드 재입점률 추가 (같은 사업자가 팝업을 2회 이상 연 비율 — 별도 API 없이 팝업 목록의 businessId로 집계)
// 8/4 — 매출 추이 차트·기간 셀렉트 삭제. 홈(8/3)에 이어 이 화면에서도 매출 지표를 내렸다 —
//        계약금 기반 «매출»이 실거래액처럼 읽히는 문제. getRevenueTrend 호출도 함께 제거.
// 8/5 — 방문자 표 두 개가 사실상 같은 정보(TOP5 차트 vs 전체 목록)라 겹쳐 보이던 것을 정리.
//        왼쪽 차트만 남기고 기본 TOP 10 + 「전체 보기」로 확장, 오른쪽은 별점 랭킹으로 교체
//        (백엔드가 목록 응답에 avgRating·reviewCount를 싣게 되면서 가능해졌다).
//        누적 방문 카드의 부제도 「랭킹 집계 팝업 N개」→ 해당 연도 표기로 바꿨다.

export default function PlatformStats() {
  const navigate = useNavigate();
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [ranking, setRanking] = useState<PopupVisitorRanking[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]); // 재입점률 집계용 (7/31)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getAdminDashboard(), getPopupRanking()])
      .then(([d, r]) => { setDash(d); setRanking(r); setError(""); })
      .catch((e) => setError(e instanceof Error ? e.message : "통계를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
    getPopups().then(setPopups).catch(() => {}); // 실패해도 재입점률 카드만 "—"로 남는다
  }, []);

  // 브랜드 재입점률 = 팝업을 2회 이상 연 사업자 / 팝업을 1회 이상 연 사업자 (7/31)
  // "다시 들어온 브랜드의 비율 = 플랫폼 만족도"라는 프레임. 재계약 데이터(ERP) 없이 지금 DB로 계산된다.
  const popupsByBusiness = popups.reduce<Record<number, number>>((acc, p) => {
    if (p.businessId != null) acc[p.businessId] = (acc[p.businessId] ?? 0) + 1;
    return acc;
  }, {});
  const brandTotal = Object.keys(popupsByBusiness).length;
  const brandReturning = Object.values(popupsByBusiness).filter((n) => n >= 2).length;
  const rebookRate = brandTotal > 0 ? (brandReturning / brandTotal) * 100 : null;

  const totalCheckin = ranking.reduce((s, r) => s + r.visitorCount, 0);
  // 8/5 — 서비스가 올해(2026) 시작이라 전체 누적 = 해당 연도 누적이다. 연도는 하드코딩하지
  // 않고 시스템 날짜에서 받아, 해가 바뀌어도 표기가 저절로 따라오게 한다.
  const year = new Date().getFullYear();

  // 8/5 — 차트 기본 TOP 10, 화살표를 누르면 TOP 20까지 펼친다.
  // 버튼은 조건 없이 항상 보인다 — 처음엔 「랭킹이 10개를 넘을 때만」으로 숨겼는데,
  // 데이터가 딱 10개인 시점엔 화살표 자체가 없어 펼침 기능이 있는 줄도 알 수 없었다.
  // 7/31 — 막대를 눌러도 상세로 가게 popupId를 함께 싣는다.
  const [showAllRanking, setShowAllRanking] = useState(false);
  const chartRows = ranking.slice(0, showAllRanking ? 20 : 10)
    .map((r) => ({ name: r.popupTitle, visitors: r.visitorCount, popupId: r.popupId }));

  // 8/5 — 별점 랭킹. 목록 응답에 avgRating·reviewCount가 실리게 되어(백엔드 enrichForList)
  // 후기가 있는 팝업만 평균 별점 순으로 세운다. 동점이면 후기 많은 쪽을 위로 —
  // 후기 1개짜리 5.0이 후기 40개짜리 4.9를 이기는 것까지는 표본 문제라 여기선 손대지 않는다.
  const ratingRank = popups
    .filter((p) => p.avgRating != null && (p.reviewCount ?? 0) > 0)
    .sort((a, b) => (b.avgRating! - a.avgRating!) || ((b.reviewCount ?? 0) - (a.reviewCount ?? 0)))
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">플랫폼 종합 성과 대시보드</h1>
        <p className="text-xs text-muted-foreground mt-0.5">전체 팝업 방문(체크인) 실데이터 집계</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-14">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 요약 지표 — dashboard BFF + 랭킹 합산 + 재입점률(팝업 목록 집계)
              8/3 — 「최근 30일 매출」 카드 제거 (홈의 매출추이 제거와 같은 결정) → 4분할 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              // 8/5 — 부제가 「랭킹 집계 팝업 N개」였는데, 카드 제목(누적 방문)과 무관한
              // 내부 사정이라 읽는 사람을 헷갈리게 했다. 해당 연도 전체 합산임을 밝힌다.
              { label: `${year}년 누적 체크인 방문`, value: `${totalCheckin.toLocaleString()}명`, sub: "전체 팝업 합산 · QR 체크인 기준" },
              { label: "게시중 / 심사 대기", value: dash ? `${dash.openPopupCount} / ${dash.pendingPopupCount}` : "—", sub: "팝업 현황" },
              { label: "누적 소비자 회원", value: dash ? `${dash.totalCustomerCount.toLocaleString()}명` : "—", sub: `활성 파트너 ${dash?.activePartnerCount ?? "—"}사` },
              // 재입점률 (7/31) — 다시 팝업을 연 브랜드 비율. 두 번째 입점이 곧 플랫폼 만족의 증거
              {
                label: "브랜드 재입점률",
                value: rebookRate === null ? "—" : `${rebookRate.toFixed(0)}%`,
                sub: brandTotal > 0 ? `${brandTotal}사 중 ${brandReturning}사가 2회 이상 입점` : "입점 브랜드 없음",
              },
            ].map((k) => (
              <div key={k.label} className="bg-card border border-border rounded-sm p-4">
                <div className="text-xs text-muted-foreground mb-1.5">{k.label}</div>
                <div className="text-xl font-semibold">{k.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* 방문자 차트 + 별점 랭킹
              8/5 — 그전에는 왼쪽 TOP5 차트와 오른쪽 「방문자 랭킹 전체」 목록이 같은 데이터를
              두 번 보여 줘 겹쳐 보였다. 차트 하나로 합치고(기본 TOP 10, 버튼으로 전량 확장),
              오른쪽은 별점 랭킹으로 바꿔 두 카드가 서로 다른 이야기를 하게 했다.
              7/31 — items-start를 뺐다. 그리드 기본값(stretch)이라 같은 줄 카드가
              같은 높이로 늘어나 아래가 직사각형으로 맞는다. */}
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-sm p-4 flex flex-col">
              <div className="text-sm font-semibold mb-1">
                팝업별 방문자 {showAllRanking ? "TOP 20" : "TOP 10"} (누적 체크인)
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">막대를 누르면 해당 팝업 상세로 이동합니다.</p>
              {/* 확장하면 행 수만큼 차트 키를 늘린다 — 고정 높이에 수십 개를 우겨 넣으면
                  막대가 실선이 되고 라벨이 겹친다. 행당 34px + 여유분.
                  8/5 — 라벨을 한 줄 말줄임으로 강제. recharts 기본 tick은 긴 이름을
                  여러 줄로 접는데, 행 간격보다 라벨이 커지면서 서로 겹치고 아래가 잘렸다.
                  자르는 건 축 라벨뿐이고 툴팁·클릭에는 원래 이름이 그대로 쓰인다. */}
              <div style={{ height: chartRows.length === 0 ? 240 : Math.max(240, chartRows.length * 34 + 16) }}>
                {chartRows.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    체크인 데이터가 없습니다.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        axisLine={false}
                        tickLine={false}
                        tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
                          <text x={x} y={y} dy={4} textAnchor="end" fontSize={11} fill="#6b7280">
                            {payload.value.length > 11 ? `${payload.value.slice(0, 11)}…` : payload.value}
                          </text>
                        )}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} formatter={(v) => `${Number(v).toLocaleString()}명`} />
                      <Bar
                        dataKey="visitors"
                        fill="#E85D3C"
                        radius={[0, 3, 3, 0]}
                        barSize={18}
                        cursor="pointer"
                        onClick={(d: { payload?: { popupId?: number } }) => {
                          const id = d?.payload?.popupId;
                          if (id) navigate(`/admin/popups/${id}`);
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              {/* 8/5 — 화살표는 조건 없이 항상 노출. 누르면 TOP 20까지 펼친다 */}
              <button
                type="button"
                onClick={() => setShowAllRanking((v) => !v)}
                className="mt-2 self-center flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllRanking ? (
                  <>접기 <ChevronUp size={12} /></>
                ) : (
                  <>TOP 20 보기 <ChevronDown size={12} /></>
                )}
              </button>
            </div>

            {/* 별점 랭킹 — 소비자 후기 평균 별점 순 (8/5, 방문자 목록을 대체) */}
            <div className="bg-card border border-border rounded-sm self-start">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold">별점 랭킹</span>
                <span className="ml-2 text-[11px] text-muted-foreground">소비자 후기 평균 별점 순</span>
              </div>
              <ul className="divide-y divide-border">
                {ratingRank.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">후기가 등록된 팝업이 없습니다.</li>
                )}
                {ratingRank.map((p, i) => (
                  <li key={p.id}>
                    <Link
                      to={`/admin/popups/${p.id}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{p.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.companyName}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[13px] font-semibold">{p.avgRating!.toFixed(1)}</span>
                        <span className="text-[11px] text-muted-foreground">({p.reviewCount})</span>
                      </div>
                      <ArrowUpRight size={12} className="shrink-0 text-muted-foreground" />
                    </Link>
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
