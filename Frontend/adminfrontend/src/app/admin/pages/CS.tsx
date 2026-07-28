import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, ChevronDown, ChevronUp, CheckCircle2, Info, Flag } from "lucide-react";
import {
  getAdminCsList, answerCs, getAdminInquiries, answerInquiry,
  getAdminReports, processReport,
  CsItem, InquiryItem, ReportItem, ReportReasonCode,
} from "../../lib/api";

// 문의 및 신고관리 — 소비자 CS(/api/admin/cs)·주최자 문의(/api/admin/inquiries)·후기 신고(/api/admin/reports) 실데이터
// 신고 접수 입구(리뷰 옆 신고 버튼)는 소비자 프론트(pew) 영역 — POST /api/reports

type Tab = "cs" | "inquiry" | "report";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  ANSWERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  PROCESSED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "답변 대기", ANSWERED: "답변 완료", PROCESSED: "처리 완료" };

const REASON_LABEL: Record<ReportReasonCode, string> = {
  ABUSE: "욕설/비방",
  SPAM: "도배/광고",
  FALSE_INFO: "허위사실",
  OTHER: "기타",
};

const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function CS() {
  const [tab, setTab] = useState<Tab>("cs");
  const [csList, setCsList] = useState<CsItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([getAdminCsList(), getAdminInquiries(), getAdminReports()])
      .then(([cs, inq, rep]) => {
        // 답변(처리) 대기 우선, 최근 접수순
        const sortFn = (a: { status: string; createdAt: string }, b: { status: string; createdAt: string }) => {
          if ((a.status === "PENDING") !== (b.status === "PENDING")) return a.status === "PENDING" ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        };
        setCsList([...cs].sort(sortFn));
        setInquiries([...inq].sort(sortFn));
        setReports([...rep].sort(sortFn));
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

  // 신고 처리완료 — PATCH /api/admin/reports/{id}/process
  const handleProcess = async (r: ReportItem) => {
    if (!window.confirm(`신고 #${r.id}(${REASON_LABEL[r.reason]})를 처리완료로 변경할까요?`)) return;
    setSavingId(r.id);
    try {
      const updated = await processReport(r.id);
      setReports((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "신고 처리에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const rows: (CsItem | InquiryItem)[] = tab === "cs" ? csList : inquiries;

  // 7/29 — 주최자 문의 재문의("RE: " 접두어)를 원 문의 스레드로 묶는다 (주최자센터 문의하기와 동일 규칙)
  const rootTitleOf = (t: string) => t.replace(/^(RE:\s*)+/, "");
  type InqThread = { root: InquiryItem; items: InquiryItem[] };
  const inqThreads = useMemo<InqThread[]>(() => {
    const map = new Map<string, InquiryItem[]>();
    for (const r of inquiries) {
      const key = `${r.companyName}::${rootTitleOf(r.title)}`; // 회사가 다른 동명 문의는 다른 스레드
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.values()]
      .map((items) => {
        items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return { root: items[0], items };
      })
      .sort((a, b) => b.items[b.items.length - 1].createdAt.localeCompare(a.items[a.items.length - 1].createdAt));
  }, [inquiries]);
  const pendingCs = csList.filter((c) => c.status === "PENDING").length;
  const pendingInq = inquiries.filter((c) => c.status === "PENDING").length;
  const pendingRep = reports.filter((c) => c.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">문의 및 신고관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">소비자 CS와 주최자 문의를 접수·답변합니다.</p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          문의 접수·답변, 후기 신고 목록·처리까지 실데이터 연동 완료. 소비자가 리뷰를 신고하는 버튼은 소비자 프론트에 구현 필요(POST /api/reports).
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {([["cs", `소비자 CS (대기 ${pendingCs})`], ["inquiry", `주최자 문의 (대기 ${pendingInq})`], ["report", `후기 신고 (대기 ${pendingRep})`]] as const).map(([k, label]) => (
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

      {/* 후기 신고 탭 — 목록 + 처리완료 */}
      {tab === "report" && (
        <div className="flex flex-col gap-2.5">
          {!loading && reports.length === 0 && !error && (
            <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
              접수된 신고가 없습니다.
            </div>
          )}
          {reports.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-sm px-4 py-3.5 flex items-start gap-3">
              <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border mt-0.5 ${STATUS_BADGE[r.status]}`}>
                {r.status === "PENDING" ? "처리 대기" : "처리 완료"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-semibold">
                  <Flag size={12} className="text-red-400 shrink-0" />
                  {REASON_LABEL[r.reason]}
                  <span className="text-[11px] font-normal text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>리뷰 #{r.reviewId}</span>
                </div>
                {r.detail && <p className="text-[13px] mt-1 whitespace-pre-wrap">{r.detail}</p>}
                <div className="text-[11px] text-muted-foreground mt-1">
                  신고자 {r.reporterNickname} · 접수 {fmt(r.createdAt)}
                  {r.status === "PROCESSED" && ` · 처리 ${r.processedBy?.replace("admin:", "")} · ${fmt(r.processedAt)}`}
                </div>
              </div>
              {r.status === "PENDING" && (
                <button
                  onClick={() => handleProcess(r)}
                  disabled={savingId === r.id}
                  className="shrink-0 flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                >
                  {savingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 처리완료
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "cs" && (
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
      )}

      {/* 주최자 문의 탭 — 7/29 스레드형: 재문의가 새 카드가 아니라 원 문의 안에 이어짐 */}
      {tab === "inquiry" && (
      <div className="flex flex-col gap-2.5">
        {!loading && inqThreads.length === 0 && !error && (
          <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
            접수된 문의가 없습니다.
          </div>
        )}
        {inqThreads.map((th) => {
          const open = openId === th.root.id;
          const hasPending = th.items.some((i) => i.status === "PENDING");
          return (
            <div key={th.root.id} className="bg-white border border-border rounded-sm">
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => { setOpenId(open ? null : th.root.id); setAnswer(""); }}>
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${hasPending ? STATUS_BADGE.PENDING : STATUS_BADGE.ANSWERED}`}>
                  {hasPending ? "답변 대기" : "답변 완료"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">
                    {rootTitleOf(th.root.title)}
                    {th.items.length > 1 && <span className="ml-1.5 text-[11px] font-normal text-accent">재문의 {th.items.length - 1}건</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">주최자 · {th.root.companyName} · 접수 {fmt(th.root.createdAt)}</div>
                </div>
                {open ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
              </button>

              {open && (
                <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                  {th.items.map((item, idx) => (
                    <div key={item.id} className="flex flex-col gap-2">
                      <div className="bg-secondary/60 rounded-sm p-3">
                        <div className="text-[11px] text-muted-foreground mb-1">
                          {idx === 0 ? "문의" : `재문의 ${idx}`} · {fmt(item.createdAt)}
                        </div>
                        <p className="text-[13px] whitespace-pre-wrap">{item.content}</p>
                      </div>
                      {item.status === "ANSWERED" ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 ml-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1.5">
                            <CheckCircle2 size={12} /> 답변 완료 · {item.answeredBy?.replace("admin:", "")} · {fmt(item.answeredAt)}
                          </div>
                          <p className="text-[13px] text-emerald-900 whitespace-pre-wrap">{item.answerContent}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end ml-4">
                          <label className="flex-1 flex flex-col gap-1.5">
                            <span className="text-xs font-medium">{idx === 0 ? "답변 작성" : "재문의 답변 작성"}</span>
                            <textarea
                              rows={3}
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              placeholder="문의에 대한 답변을 입력해 주세요."
                              className="w-full px-3 py-2 text-[13px] border border-border rounded-sm resize-y focus:outline-none focus:border-accent"
                            />
                          </label>
                          <button
                            onClick={() => submitAnswer(item.id)}
                            disabled={savingId === item.id}
                            className="shrink-0 flex items-center justify-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                          >
                            {savingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 답변 등록
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
