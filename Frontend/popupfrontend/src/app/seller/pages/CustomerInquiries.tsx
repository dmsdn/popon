import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, Send, ChevronDown, ChevronUp, CheckCircle2, Info } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMyPopups } from "../../lib/api";
import {
  loadCustomerInquiries, answerCustomerInquiry, seedIfEmpty, CustomerInquiry,
} from "../../lib/customerInquiries";

// 문의받기 — 소비자가 내 팝업에 남긴 문의를 한 표에서 확인·답변.
// 팝업별 화면 분리 없이 전체를 리스팅하고, 팝업명 열로 어떤 팝업 문의인지 구분한다.
// ⚠ 소비자→주최자 문의 API·소비자 앱 문의 버튼은 백엔드 구성 후 연동 (현재 이 브라우저 저장 데모)

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  ANSWERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "답변 대기", ANSWERED: "답변 완료" };
const fmt = (iso: string | null | undefined) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

export default function CustomerInquiries() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [list, setList] = useState<CustomerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isBusiness) {
      setLoading(false);
      return;
    }
    // 데모: 저장된 문의가 없으면 내 팝업 제목으로 예시 2건 시드
    getMyPopups()
      .then((popups) => setList(sortList(seedIfEmpty(popups))))
      .catch(() => setList(sortList(loadCustomerInquiries())))
      .finally(() => setLoading(false));
  }, [isBusiness]);

  const sortList = (l: CustomerInquiry[]) =>
    [...l].sort((a, b) => {
      if ((a.status === "PENDING") !== (b.status === "PENDING")) return a.status === "PENDING" ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const submitAnswer = (q: CustomerInquiry) => {
    if (!answer.trim()) {
      alert("답변 내용을 입력해 주세요.");
      return;
    }
    setSavingId(q.id);
    setList(sortList(answerCustomerInquiry(q.id, answer.trim())));
    setSavingId(null);
    setOpenId(null);
    setAnswer("");
  };

  if (!isBusiness) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">문의받기</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          주최자(사업자) 계정으로 로그인해야 사용할 수 있습니다.{" "}
          <Link to="/login" state={{ from: "/seller/customer-inquiries" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      </div>
    );
  }

  const pending = list.filter((q) => q.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">문의받기</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          소비자가 내 팝업에 남긴 문의를 확인하고 답변합니다. (답변 대기 {pending}건)
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          소비자→주최자 문의 API와 소비자 앱의 문의 버튼은 <strong>백엔드 구성 후 연동</strong> 예정입니다.
          현재는 예시 데이터로 답변 흐름만 동작합니다(이 브라우저 저장).
        </div>
      </div>

      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      {/* 전체 팝업 문의를 한 표에 — 팝업명 열로 구분 */}
      {!loading && (
        <div className="bg-white border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">팝업명</th>
                <th className="text-left font-medium px-4 py-2.5">문의자</th>
                <th className="text-left font-medium px-4 py-2.5">제목</th>
                <th className="text-left font-medium px-4 py-2.5">접수일</th>
                <th className="text-left font-medium px-4 py-2.5">상태</th>
                <th className="text-center font-medium px-4 py-2.5">답변</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((q) => {
                const open = openId === q.id;
                return (
                  <Fragment key={q.id}>
                    <tr className="hover:bg-secondary/40">
                      <td className="px-4 py-3 font-medium">{q.popupTitle}</td>
                      <td className="px-4 py-3">{q.customerName}</td>
                      <td className="px-4 py-3">{q.title}</td>
                      <td className="px-4 py-3 text-xs">{fmt(q.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[q.status]}`}>{STATUS_LABEL[q.status]}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setOpenId(open ? null : q.id); setAnswer(""); }}
                          className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border transition-colors ${
                            open ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:border-accent hover:text-accent"
                          }`}
                        >
                          {q.status === "PENDING" ? "답변하기" : "답변 보기"} {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-secondary/30">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="max-w-2xl flex flex-col gap-3">
                            <div className="bg-white border border-border rounded-sm p-3 text-[13px] whitespace-pre-wrap">{q.content}</div>
                            {q.status === "ANSWERED" ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1.5">
                                  <CheckCircle2 size={12} /> 내 답변 · {fmt(q.answeredAt)}
                                </div>
                                <p className="text-[13px] text-emerald-900 whitespace-pre-wrap">{q.answerContent}</p>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                                <label className="flex-1 flex flex-col gap-1.5">
                                  <span className="text-xs font-medium">답변 작성</span>
                                  <textarea
                                    rows={3}
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    placeholder="소비자에게 전달할 답변을 입력해 주세요."
                                    className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white resize-y focus:outline-none focus:border-accent"
                                  />
                                </label>
                                <button
                                  onClick={() => submitAnswer(q)}
                                  disabled={savingId === q.id}
                                  className="shrink-0 flex items-center justify-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                                >
                                  {savingId === q.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 답변 등록
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-xs text-muted-foreground">접수된 소비자 문의가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
