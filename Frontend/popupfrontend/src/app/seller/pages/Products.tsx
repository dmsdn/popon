import { useState } from "react";
import { Plus, PackagePlus, AlertTriangle } from "lucide-react";
import { PRODUCTS } from "../data";

export default function Products() {
  const [rows, setRows] = useState(PRODUCTS.map((p) => ({ ...p })));
  const [showForm, setShowForm] = useState(false);

  const restock = (id: string) =>
    setRows((prev) => prev.map((p) => (p.id === id ? { ...p, stock: p.stock + 100 } : p)));

  const inputCls = "w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">상품(굿즈)/재고 관리</h1>
          <p className="text-xs text-muted-foreground mt-0.5">재고가 안전재고 이하로 내려가면 자동으로 부족 알림이 발송됩니다.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90">
          <Plus size={13} /> 상품 등록
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-accent/40 rounded-sm p-5">
          <div className="text-sm font-semibold mb-4">새 상품 등록</div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">상품명 *</label>
              <input className={inputCls} placeholder="예: 한정판 에코백" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">옵션</label>
              <input className={inputCls} placeholder="예: 블랙 / 화이트" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">판매가 (원) *</label>
              <input type="number" className={inputCls} placeholder="25000" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">초기 입고 수량 *</label>
              <input type="number" className={inputCls} placeholder="200" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="text-xs px-4 py-2 border border-border rounded-sm hover:bg-secondary">취소</button>
            <button onClick={() => setShowForm(false)} className="text-xs px-5 py-2 rounded-sm bg-foreground text-white hover:opacity-90">등록</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">상품코드</th>
              <th className="text-left font-medium px-4 py-2.5">상품명 / 옵션</th>
              <th className="text-right font-medium px-4 py-2.5">판매가</th>
              <th className="text-right font-medium px-4 py-2.5">누적 판매</th>
              <th className="text-right font-medium px-4 py-2.5">현재 재고</th>
              <th className="text-left font-medium px-4 py-2.5">재고 상태</th>
              <th className="text-center font-medium px-4 py-2.5">입고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p) => {
              const low = p.stock <= p.safety;
              const out = p.stock === 0;
              return (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{p.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">옵션: {p.option}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{p.price.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right">{p.sold.toLocaleString()}개</td>
                  <td className={`px-4 py-3 text-right font-semibold ${out ? "text-red-500" : low ? "text-amber-600" : ""}`}>
                    {p.stock.toLocaleString()}개
                  </td>
                  <td className="px-4 py-3">
                    {out ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                        <AlertTriangle size={10} /> 품절
                      </span>
                    ) : low ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                        <AlertTriangle size={10} /> 안전재고 미달
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">정상</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => restock(p.id)} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border border-border hover:border-accent hover:text-accent">
                      <PackagePlus size={11} /> +100 입고
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
