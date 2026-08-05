import { useEffect, useState } from "react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar,
} from "recharts";
import { Loader2, ArrowUpRight } from "lucide-react";
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
  // 7/31 — 막대를 눌러도 상세로 가게 popupId를 함께 싣는다.
  // 오른쪽 「랭킹 전체」만 클릭되고 왼쪽 차트는 안 되면 같은 팝업인데 동작이 갈려 혼란스럽다.
  const top5 = ranking.slice(0, 5).map((r) => ({ name: r.popupTitle, visitors: r.visitorCount, popupId: r.popupId }));

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
              { label: "누적 체크인 방문", value: `${totalCheckin.toLocaleString()}명`, sub: `랭킹 집계 팝업 ${ranking.length}개` },
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

          {/* 방문자 랭킹 */}
          {/* 7/31 — items-start를 뺐다. 그리드 기본값(stretch)이라 같은 줄 카드가
              같은 높이로 늘어나 아래가 직사각형으로 맞는다.
              items-start면 카드마다 내용 높이가 달라 아랫변이 들쭉날쭉했다(310 vs 412). */}
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-sm p-4">
              <div className="text-sm font-semibold mb-1">팝업별 방문자 TOP 5 (누적 체크인)</div>
              <p className="text-[11px] text-muted-foreground mb-3">막대를 누르면 해당 팝업 상세로 이동합니다.</p>
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
            </div>

            <div className="bg-card border border-border rounded-sm">
              <div className="px-4 py-3 border-b border-border text-sm font-semibold">방문자 랭킹 전체</div>
              <ul className="divide-y divide-border">
                {ranking.length === 0 && (
                  <li className="px-4 py-8 text-center text-xs text-muted-foreground">체크인 데이터가 없습니다.</li>
                )}
                {/* 7/31 — 행 전체를 팝업 상세로 연결. 그전에는 이름이 보이는데 눌러도 아무 일이 없었다 */}
                {ranking.slice(0, 8).map((r) => (
                  <li key={r.popupId}>
                    <Link
                      to={`/admin/popups/${r.popupId}`}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{r.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate">{r.popupTitle}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.companyName}</div>
                      </div>
                      <div className="text-[13px] font-semibold shrink-0">{r.visitorCount.toLocaleString()}명</div>
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
