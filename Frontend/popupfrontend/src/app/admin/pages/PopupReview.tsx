import { useState } from "react";
import { CheckCircle2, XCircle, Eye, ChevronDown, ChevronUp } from "lucide-react";

type ReviewState = "대기" | "승인" | "반려";

const INITIAL = [
  {
    id: "PU-2407-014", name: "글로우랩 선케어 스튜디오", brand: "글로우랩", org: "㈜글로우랩",
    period: "2026-07-20 ~ 08-03", venue: "더현대 서울 B1 팝업존", requested: "07-14 16:22",
    cats: ["뷰티"], images: 14, state: "대기" as ReviewState,
    checks: { 이미지품질: true, 정보정확성: true, 정책준수: true, 서류완비: true },
  },
  {
    id: "PU-2407-025", name: "어반 커피 로스터리 위크", brand: "빈브라더스X", org: "빈컴퍼니",
    period: "2026-08-05 ~ 08-19", venue: "성수 언더스탠드에비뉴 B동", requested: "07-14 11:03",
    cats: ["F&B"], images: 9, state: "대기" as ReviewState,
    checks: { 이미지품질: true, 정보정확성: false, 정책준수: true, 서류완비: true },
  },
  {
    id: "PU-2407-026", name: "K-웹툰 히어로즈전", brand: "툰스튜디오", org: "㈜툰스튜디오",
    period: "2026-08-12 ~ 09-01", venue: "홍대 AK& 5F 이벤트홀", requested: "07-13 19:40",
    cats: ["캐릭터", "아트"], images: 22, state: "대기" as ReviewState,
    checks: { 이미지품질: false, 정보정확성: true, 정책준수: true, 서류완비: false },
  },
];

const STATE_BADGE: Record<ReviewState, string> = {
  대기: "bg-amber-50 text-amber-600 border-amber-200",
  승인: "bg-emerald-50 text-emerald-600 border-emerald-200",
  반려: "bg-red-50 text-red-500 border-red-200",
};

export default function PopupReview() {
  const [rows, setRows] = useState(INITIAL);
  const [open, setOpen] = useState<string | null>(INITIAL[0].id);
  const [reason, setReason] = useState("");

  const decide = (id: string, state: ReviewState) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, state } : r)));
    setOpen(null);
    setReason("");
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold">팝업 심사·게시 승인</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          주최자가 등록한 팝업을 검수 후 승인/반려합니다. 승인 즉시 소비자 상세화면이 자동 생성·게시됩니다.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-sm">
            <button className="w-full px-5 py-4 flex items-center gap-4 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATE_BADGE[r.state]}`}>{r.state}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {r.brand} ({r.org}) · {r.period} · {r.venue}
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <div className="text-[11px] text-muted-foreground">요청 {r.requested}</div>
                <div className="text-[11px] text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{r.id}</div>
              </div>
              {open === r.id ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
            </button>

            {open === r.id && (
              <div className="px-5 pb-5 border-t border-border pt-4 flex flex-col gap-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="bg-secondary/60 rounded-sm p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">카테고리</div>
                    <div className="text-[13px] font-medium">{r.cats.join(", ")}</div>
                  </div>
                  <div className="bg-secondary/60 rounded-sm p-3">
                    <div className="text-[11px] text-muted-foreground mb-1">등록 이미지</div>
                    <div className="text-[13px] font-medium">{r.images}장</div>
                  </div>
                  <button className="bg-secondary/60 rounded-sm p-3 text-left hover:bg-secondary group">
                    <div className="text-[11px] text-muted-foreground mb-1">소비자 화면</div>
                    <div className="text-[13px] font-medium flex items-center gap-1 group-hover:text-accent"><Eye size={13} /> 미리보기</div>
                  </button>
                </div>

                {/* 검수 체크리스트 */}
                <div>
                  <div className="text-xs font-medium mb-2">검수 체크리스트</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(r.checks).map(([k, ok]) => (
                      <span key={k} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border ${
                        ok ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"
                      }`}>
                        {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1.5">반려 사유 (반려 시 필수 · 주최자에게 전달됨)</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="예: 대표 이미지 화질 기준 미달"
                      className="w-full px-3 py-2 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => decide(r.id, "반려")} className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-sm border border-red-300 text-red-500 hover:bg-red-50">
                      <XCircle size={13} /> 반려
                    </button>
                    <button onClick={() => decide(r.id, "승인")} className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700">
                      <CheckCircle2 size={13} /> 승인·게시
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
