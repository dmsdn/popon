import { Link } from "react-router";
import { ArrowUpRight, AlertTriangle, Users, CalendarCheck, Package, Store } from "lucide-react";
import { MY_POPUPS, PRODUCTS, STATUS_BADGE } from "../data";

const KPI = [
  { icon: Users, label: "오늘 방문자", value: "1,387명", diff: "+14.3% 전일 대비" },
  { icon: CalendarCheck, label: "오늘 예약", value: "310건", diff: "슬롯 소진율 78%" },
  { icon: Store, label: "현재 대기열", value: "23팀", diff: "예상 대기 35분" },
  { icon: Package, label: "재고 부족 상품", value: "3건", diff: "안전재고 미달" },
];

export default function SellerDashboard() {
  const lowStock = PRODUCTS.filter((p) => p.stock <= p.safety);
  const rejected = MY_POPUPS.find((p) => p.status === "반려");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">대시보드</h1>
          <p className="text-xs text-muted-foreground mt-0.5">2026-07-15 (화) 기준 · 게시중 팝업 「무너의 여름방학 팝업」</p>
        </div>
        <Link to="/seller/popups/new" className="text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90">
          + 새 팝업 등록
        </Link>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {KPI.map(({ icon: Icon, label, value, diff }) => (
          <div key={label} className="bg-white border border-border rounded-sm p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><Icon size={13} /> {label}</div>
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{diff}</div>
          </div>
        ))}
      </div>

      {/* 알림/처리 필요 */}
      <div className="grid lg:grid-cols-2 gap-3">
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">처리가 필요한 항목</span>
          </div>
          <ul className="divide-y divide-border">
            {rejected && (
              <li className="px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">「{rejected.name}」 심사 반려</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{rejected.note}</div>
                </div>
                <Link to="/seller/popups" className="text-xs text-accent shrink-0 flex items-center">수정 <ArrowUpRight size={11} /></Link>
              </li>
            )}
            {lowStock.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-start gap-3">
                <Package size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{p.name} ({p.option}) 재고 {p.stock === 0 ? "소진" : "부족"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">현재 {p.stock}개 · 안전재고 {p.safety}개</div>
                </div>
                <Link to="/seller/products" className="text-xs text-accent shrink-0 flex items-center">입고 <ArrowUpRight size={11} /></Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 내 팝업 현황 */}
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">내 팝업 게시 상태</span>
            <Link to="/seller/popups" className="text-xs text-accent">전체 보기</Link>
          </div>
          <ul className="divide-y divide-border">
            {MY_POPUPS.slice(0, 4).map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.period} · {p.venue}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
