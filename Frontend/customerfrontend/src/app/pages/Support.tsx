import { useState } from "react";
import { ChevronDown, ChevronUp, Headphones, CheckCircle2 } from "lucide-react";
import { FAQS } from "../data";

const TYPES = ["예약/웨이팅", "결제/쿠폰", "계정", "팝업 정보 오류", "기타"];

export default function Support() {
  const [open, setOpen] = useState<number | null>(0);
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col pt-4 pb-8">
      <div className="px-4 mb-5">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "'Noto Serif KR', serif" }}>고객센터</h1>
        <p className="text-xs text-muted-foreground mt-0.5">자주 묻는 질문을 먼저 확인해 보세요.</p>
      </div>

      {/* FAQ */}
      <section className="px-4 mb-7">
        <h2 className="text-sm font-semibold mb-2.5">자주 묻는 질문</h2>
        <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {FAQS.map((f, i) => (
            <div key={f.q}>
              <button className="w-full flex items-center gap-3 p-3.5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="text-accent text-xs font-bold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>Q</span>
                <span className="flex-1 text-[13px] font-medium">{f.q}</span>
                {open === i ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>
              {open === i && (
                <div className="px-3.5 pb-3.5 pl-10 text-xs text-muted-foreground leading-relaxed bg-secondary/40">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 문의하기 */}
      <section className="px-4">
        <h2 className="text-sm font-semibold mb-2.5">1:1 문의하기</h2>
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-8 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
            <p className="text-[13px] font-medium text-emerald-700">문의가 접수되었어요</p>
            <p className="text-[11px] text-emerald-700/80">영업일 기준 1일 이내에 답변드릴게요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t, i) => (
                <label key={t} className="cursor-pointer">
                  <input type="radio" name="qtype" defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-block text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground peer-checked:bg-accent peer-checked:text-white peer-checked:border-accent">
                    {t}
                  </span>
                </label>
              ))}
            </div>
            <input placeholder="제목" className="w-full px-3.5 py-3 text-[13px] bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <textarea rows={5} placeholder="예약·결제 등 궁금한 내용을 자세히 적어주세요."
              className="w-full px-3.5 py-3 text-[13px] leading-relaxed bg-secondary rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30" />
            <button onClick={() => setSent(true)} className="flex items-center justify-center gap-1.5 w-full text-sm py-3.5 rounded-lg bg-accent text-white font-medium">
              <Headphones size={15} /> 문의 접수하기
            </button>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground text-center mt-4">
          고객센터 1588-0000 · 평일 09:00 — 18:00
        </p>
      </section>
    </div>
  );
}
