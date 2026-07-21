import { useEffect, useState } from "react";
import { Loader2, Send, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";
import {
  getAdminCsList, answerCs, getAdminInquiries, answerInquiry,
  CsItem, InquiryItem,
} from "../../lib/api";

// CS·리뷰 모더레이션 — 소비자 CS(/api/admin/cs)·주최자 문의(/api/admin/inquiries) 실데이터 + 답변 등록
// 후기 신고 모더레이션은 리뷰 신고 API 백엔드 구성 후 연동

type Tab = "cs" | "inquiry";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  ANSWERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "답변 대기", ANSWERED: "답변 완료" };

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function CS() {
  const [tab, setTab] = useState<Tab>("cs");
  const [csList, setCsList] = useState<CsItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getAdminCsList(), getAdminInquiries()])
      .then(([cs, inq]) => {
        // 답변 대기 우선, 최근 접수순
        const sortFn = (a: { status: string; createdAt: string }, b: { status: string; createdAt: string }) => {
          if ((a.status === "PENDING") !== (b.status === "PENDING")) return a.status === "PENDING" ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        };
        setCsList([...cs].sort(sortFn));
        setInquiries([...inq].sort(sortFn));
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "문의 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const submitAnswer = async (id: number) => {
    if (!answer.trim()) {
      alert("답변 내용을 입력해 주세요.");
      return;
    }
    setSavingId(id);
    try {
      if (tab === "cs") {
        const updated = await answerCs(id, answer.trim());
        setCsList((prev) => prev.map((x) => (x.id === id ? updated : x)));
      } else {
        const updated = await answerInquiry(id, answer.trim());
        setInquiries((prev) => prev.map((x) => (x.id === id ? updated : x)));
      }
      setOpenId(null);
      setAnswer("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "답변 등록에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const rows: (CsItem | InquiryItem)[] = tab === "cs" ? csList : inquiries;
  const pendingCs = csList.filter((c) => c.status === "PENDING").length;
  const pendingInq = inquiries.filter((c) => c.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">문의 및 신고관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">소비자 CS와 주최자 문의를 접수·답변합니다.</p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          문의 접수·답변은 실데이터 연동 완료. <strong>후기 신고 모더레이션</strong>은 리뷰 신고 API 백엔드 구성 후 연동 필요.
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {([["cs", `소비자 CS (대기 ${pendingCs})`], ["inquiry", `주최자 문의 (대기 ${pendingInq})`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); setOpenId(null); setAnswer(""); }}
            className={`text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {!loading && rows.length === 0 && !error && (
          <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
            접수된 문의가 없습니다.
          </div>
        )}
        {rows.map((r) => {
          const from = "customerNickname" in r ? `소비자 · ${r.customerNickname}` : `주최자 · ${(r as InquiryItem).companyName}`;
          const open = openId === r.id;
          return (
            <div key={r.id} className="bg-white border border-border rounded-sm">
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => { setOpenId(open ? null : r.id); setAnswer(""); }}>
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{from} · 접수 {fmt(r.createdAt)}</div>
                </div>
                {open ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
              </button>

              {open && (
                <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                  <div className="bg-secondary/60 rounded-sm p-3 text-[13px] whitespace-pre-wrap">{r.content}</div>

                  {r.status === "ANSWERED" ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1.5">
                        <CheckCircle2 size={12} /> 답변 완료 · {r.answeredBy?.replace("admin:", "")} · {fmt(r.answeredAt)}
                      </div>
                      <p className="text-[13px] text-emerald-900 whitespace-pre-wrap">{r.answerContent}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                      <label className="flex-1 flex flex-col gap-1.5">
                        <span className="text-xs font-medium">답변 작성</span>
                        <textarea
                          rows={3}
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="문의에 대한 답변을 입력해 주세요."
                          className="w-full px-3 py-2 text-[13px] border border-border rounded-sm resize-y focus:outline-none focus:border-accent"
                        />
                      </label>
                      <button
                        onClick={() => submitAnswer(r.id)}
                        disabled={savingId === r.id}
                        className="shrink-0 flex items-center justify-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                      >
                        {savingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 답변 등록
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
