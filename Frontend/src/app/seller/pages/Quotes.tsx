import { Check, MessageSquare, FileText } from "lucide-react";

const QUOTE_ITEMS = [
  { item: "공간 대관료 (성수 A동, 18일)", type: "정형", amount: "13,500,000원", state: "즉시 확인" },
  { item: "기본 전기·통신 사용료", type: "정형", amount: "420,000원", state: "즉시 확인" },
  { item: "부스 디자인·시공비", type: "상담", amount: "견적 상담 중", state: "담당자 배정됨" },
  { item: "현장 보안·안전 인력 (2명)", type: "정형", amount: "1,980,000원", state: "즉시 확인" },
];

const STAGES = ["견적 확정", "계약 체결", "디자인 확정", "제작·시공", "운영 중", "철거·정산"];
const CURRENT = 3; // 제작·시공 단계

const TIMELINE = [
  { date: "06-20", text: "견적서 v2 확정 · 전자서명 완료" },
  { date: "06-24", text: "표준 대관 계약 체결 (계약번호 CT-2606-118)" },
  { date: "07-01", text: "3D 렌더링 시안 2차 피드백 반영 · 디자인 확정" },
  { date: "07-08", text: "부스 제작 착수 · 현장 설치 07-09 예정" },
];

export default function Quotes() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">견적·계약·진행 단계</h1>
        <p className="text-xs text-muted-foreground mt-0.5">「무너의 여름방학 팝업」 · 공간 대관료 등 정형 항목은 즉시 확인, 디자인·시공비는 상담으로 확정됩니다.</p>
      </div>

      {/* 진행 단계 스텝퍼 */}
      <div className="bg-white border border-border rounded-sm p-5">
        <div className="text-sm font-semibold mb-5">진행 단계</div>
        <div className="flex items-center">
          {STAGES.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium border-2 ${
                    i < CURRENT
                      ? "bg-accent border-accent text-white"
                      : i === CURRENT
                        ? "border-accent text-accent bg-accent/10"
                        : "border-border text-muted-foreground bg-white"
                  }`}
                >
                  {i < CURRENT ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-[11px] whitespace-nowrap ${i === CURRENT ? "text-accent font-semibold" : "text-muted-foreground"}`}>{s}</span>
              </div>
              {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < CURRENT ? "bg-accent" : "bg-border"}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 items-start">
        {/* 견적 내역 */}
        <div className="bg-white border border-border rounded-sm">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold">견적 내역</span>
            <button className="flex items-center gap-1 text-xs text-accent"><FileText size={12} /> 견적서 PDF</button>
          </div>
          <ul className="divide-y divide-border">
            {QUOTE_ITEMS.map((q) => (
              <li key={q.item} className="px-4 py-3 flex items-center gap-3">
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${
                  q.type === "정형" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200"
                }`}>{q.type}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px]">{q.item}</div>
                  <div className="text-[11px] text-muted-foreground">{q.state}</div>
                </div>
                <div className="text-[13px] font-semibold shrink-0">{q.amount}</div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-secondary/50">
            <span className="text-xs text-muted-foreground">확정 항목 합계 (VAT 별도)</span>
            <span className="text-sm font-bold">15,900,000원</span>
          </div>
          <div className="px-4 py-3">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs px-4 py-2.5 border border-accent text-accent rounded-sm hover:bg-accent/5">
              <MessageSquare size={13} /> 디자인·시공비 상담 요청
            </button>
          </div>
        </div>

        {/* 진행 타임라인 + 정산 */}
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold">진행 이력</div>
            <ul className="p-4 flex flex-col gap-4">
              {TIMELINE.map((t) => (
                <li key={t.date} className="flex gap-3">
                  <span className="shrink-0 text-[11px] text-muted-foreground w-11 pt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{t.date}</span>
                  <div className="relative flex-1 pb-1 text-[13px] leading-relaxed before:absolute before:-left-2 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-accent pl-2">
                    {t.text}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-border rounded-sm p-4">
            <div className="text-sm font-semibold mb-2">정산 안내 (법인 후불)</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              팝업 종료 후 월말 통합 정산으로 청구됩니다. 정산 내역은 팝업 종료(07-27) 이후 이 화면에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
