import { useState } from "react";
import { Plus, MapPin, Tags, Pencil, Trash2 } from "lucide-react";

const SPACES = [
  { id: "SP-001", name: "성수 언더스탠드에비뉴 A동", addr: "서울 성동구 왕십리로 63", size: "120㎡", fee: "일 750,000원", facilities: "전기 3kW · 급수 · 하역장", active: true },
  { id: "SP-002", name: "성수 언더스탠드에비뉴 B동", addr: "서울 성동구 왕십리로 63", size: "85㎡", fee: "일 520,000원", facilities: "전기 3kW · 급수", active: true },
  { id: "SP-003", name: "더현대 서울 B1 팝업존", addr: "서울 영등포구 여의대로 108", size: "60㎡", fee: "일 900,000원", facilities: "전기 5kW · 보안 상주", active: true },
  { id: "SP-004", name: "홍대 AK& 5F 이벤트홀", addr: "서울 마포구 양화로 188", size: "150㎡", fee: "일 680,000원", facilities: "전기 5kW · 화물EV", active: true },
  { id: "SP-005", name: "잠실 롯데월드몰 1F 아트리움", addr: "서울 송파구 올림픽로 300", size: "200㎡", fee: "일 1,400,000원", facilities: "전기 10kW · 보안 상주 · 하역장", active: false },
];

const CATEGORIES = [
  { name: "패션", tags: 24, popups: 11 },
  { name: "뷰티", tags: 18, popups: 8 },
  { name: "F&B", tags: 31, popups: 12 },
  { name: "캐릭터", tags: 27, popups: 9 },
  { name: "라이프스타일", tags: 15, popups: 5 },
  { name: "아트", tags: 12, popups: 2 },
  { name: "테크", tags: 9, popups: 1 },
];

export default function Masters() {
  const [tab, setTab] = useState<"spaces" | "categories">("spaces");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">공간·카테고리 마스터 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">전체 팝업에 공통 적용되는 대관 공간 DB와 카테고리·태그를 관리합니다.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["spaces", "공간(대관처) DB", MapPin], ["categories", "카테고리·태그", Tags]] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "spaces" ? (
        <div className="bg-white border border-border rounded-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">등록 공간 {SPACES.length}곳</span>
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90">
              <Plus size={12} /> 공간 등록
            </button>
          </div>
          <table className="w-full text-[13px] min-w-[820px]">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">코드</th>
                <th className="text-left font-medium px-4 py-2.5">공간명 / 주소</th>
                <th className="text-right font-medium px-4 py-2.5">면적</th>
                <th className="text-right font-medium px-4 py-2.5">임대료</th>
                <th className="text-left font-medium px-4 py-2.5">시설 정보</th>
                <th className="text-center font-medium px-4 py-2.5">대관 상태</th>
                <th className="text-center font-medium px-4 py-2.5">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SPACES.map((s) => (
                <tr key={s.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{s.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.addr}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{s.size}</td>
                  <td className="px-4 py-3 text-right">{s.fee}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{s.facilities}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${s.active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                      {s.active ? "대관 가능" : "휴지"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <button className="hover:text-foreground"><Pencil size={13} /></button>
                      <button className="hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">카테고리 {CATEGORIES.length}개</span>
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90">
              <Plus size={12} /> 카테고리 추가
            </button>
          </div>
          <div className="p-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="border border-border rounded-sm p-4 flex items-center justify-between hover:border-accent/50">
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">하위 태그 {c.tags}개 · 게시중 팝업 {c.popups}건</div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <button className="hover:text-foreground"><Pencil size={13} /></button>
                  <button className="hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
