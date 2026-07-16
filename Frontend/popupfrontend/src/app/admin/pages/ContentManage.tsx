import { useState } from "react";
import { GripVertical, Plus, Eye, EyeOff, Newspaper, Image as ImageIcon } from "lucide-react";

const INITIAL_BANNERS = [
  { id: 1, title: "여름 시즌 팝업 특집 — 성수동 핫플 총정리", period: "07-01 ~ 07-31", visible: true },
  { id: 2, title: "이달의 Pick: 무너의 여름방학 팝업", period: "07-10 ~ 07-27", visible: true },
  { id: 3, title: "신규 파트너 등록 프로모션 (수수료 50% 할인)", period: "07-01 ~ 08-31", visible: true },
  { id: 4, title: "가을 팝업 사전예약 오픈 예고", period: "08-15 ~ 09-01", visible: false },
];

const MAGAZINES = [
  { title: "7월 넷째 주 뉴스레터 — 주말에 갈 만한 팝업 7선", state: "발행됨", date: "07-14" },
  { title: "브랜드 인터뷰: 무너프렌즈가 팝업을 여는 법", state: "발행됨", date: "07-11" },
  { title: "8월 시즌 프리뷰 매거진", state: "예약발행 (07-28 09:00)", date: "-" },
  { title: "팝업 공간 트렌드 리포트 2026 상반기", state: "임시저장", date: "-" },
];

export default function ContentManage() {
  const [banners, setBanners] = useState(INITIAL_BANNERS);
  const toggle = (id: number) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, visible: !b.visible } : b)));

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold">배너·콘텐츠 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">소비자 서비스 홈 배너 노출과 매거진·뉴스레터 발행을 관리합니다.</p>
      </div>

      {/* 메인 배너 */}
      <div className="bg-white border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2"><ImageIcon size={14} className="text-muted-foreground" /> 메인 배너 노출 순서</span>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90">
            <Plus size={12} /> 배너 추가
          </button>
        </div>
        <ul className="divide-y divide-border">
          {banners.map((b, i) => (
            <li key={b.id} className={`px-4 py-3 flex items-center gap-3 ${!b.visible ? "opacity-50" : ""}`}>
              <GripVertical size={14} className="text-muted-foreground/50 cursor-grab shrink-0" />
              <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{b.title}</div>
                <div className="text-[11px] text-muted-foreground">노출 기간: {b.period}</div>
              </div>
              <button
                onClick={() => toggle(b.id)}
                className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border ${
                  b.visible ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-border text-muted-foreground"
                }`}
              >
                {b.visible ? <><Eye size={11} /> 노출중</> : <><EyeOff size={11} /> 숨김</>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 매거진·뉴스레터 */}
      <div className="bg-white border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2"><Newspaper size={14} className="text-muted-foreground" /> 매거진·뉴스레터</span>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent">
            <Plus size={12} /> 새 콘텐츠 작성
          </button>
        </div>
        <ul className="divide-y divide-border">
          {MAGAZINES.map((m) => (
            <li key={m.title} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{m.title}</div>
                <div className="text-[11px] text-muted-foreground">발행일: {m.date}</div>
              </div>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${
                m.state === "발행됨"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : m.state.startsWith("예약")
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>{m.state}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
