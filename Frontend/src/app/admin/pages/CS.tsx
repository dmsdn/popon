import { useState } from "react";
import { Headphones, Flag, Eye, EyeOff, UserCheck } from "lucide-react";

type TicketState = "미배정" | "처리중" | "완료";

const TICKETS = [
  { id: "CS-3301", type: "예약", from: "소비자", title: "QR코드가 열리지 않아요 (무너 팝업)", received: "07-15 10:42", assignee: "-", state: "미배정" as TicketState },
  { id: "CS-3300", type: "정산", from: "주최자", title: "6월 정산서 세부 항목 문의 (레코드랩)", received: "07-15 10:15", assignee: "김지원", state: "처리중" as TicketState },
  { id: "CS-3299", type: "계정", from: "주최자", title: "파트너 계정 접근권한 추가 요청 (글로우랩)", received: "07-15 09:58", assignee: "-", state: "미배정" as TicketState },
  { id: "CS-3298", type: "예약", from: "소비자", title: "노쇼 처리 이의 신청", received: "07-14 18:31", assignee: "이현우", state: "처리중" as TicketState },
  { id: "CS-3295", type: "기타", from: "소비자", title: "휠체어 접근 가능 여부 문의", received: "07-14 15:02", assignee: "김지원", state: "완료" as TicketState },
];

const REVIEWS = [
  { id: "RV-8812", popup: "무너의 여름방학 팝업", reason: "부적절한 사진 포함", content: "굿즈는 좋은데 사진에 타인 얼굴이 그대로…", reports: 3, visible: true },
  { id: "RV-8807", popup: "선셋 무드 향수전", reason: "욕설·비방", content: "직원이 ○○같이 응대함. 최악.", reports: 5, visible: true },
  { id: "RV-8790", popup: "빈티지 바이닐 마켓", reason: "광고·홍보성", content: "우리 매장 오시면 같은 LP 반값! 링크 클릭…", reports: 2, visible: false },
];

const STATE_BADGE: Record<TicketState, string> = {
  미배정: "bg-red-50 text-red-500 border-red-200",
  처리중: "bg-blue-50 text-blue-600 border-blue-200",
  완료: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function CS() {
  const [tab, setTab] = useState<"tickets" | "reviews">("tickets");
  const [tickets, setTickets] = useState(TICKETS);
  const [reviews, setReviews] = useState(REVIEWS);

  const assign = (id: string) =>
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, assignee: "김지원", state: "처리중" as TicketState } : t)));
  const toggleReview = (id: string) =>
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r)));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">CS·리뷰 모더레이션</h1>
        <p className="text-xs text-muted-foreground mt-0.5">문의 접수·담당자 배정과 신고된 후기의 노출 여부를 처리합니다.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["tickets", "문의 접수", Headphones], ["reviews", "후기 신고", Flag]] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {k === "tickets" ? tickets.filter((t) => t.state !== "완료").length : reviews.length}
            </span>
          </button>
        ))}
      </div>

      {tab === "tickets" ? (
        <div className="bg-white border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                <th className="text-left font-medium px-4 py-2.5">접수번호</th>
                <th className="text-left font-medium px-4 py-2.5">유형</th>
                <th className="text-left font-medium px-4 py-2.5">문의자</th>
                <th className="text-left font-medium px-4 py-2.5">제목</th>
                <th className="text-left font-medium px-4 py-2.5">접수 시각</th>
                <th className="text-left font-medium px-4 py-2.5">담당자</th>
                <th className="text-left font-medium px-4 py-2.5">상태</th>
                <th className="text-center font-medium px-4 py-2.5">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{t.id}</td>
                  <td className="px-4 py-3"><span className="text-[11px] px-2 py-0.5 rounded-sm bg-secondary text-muted-foreground">{t.type}</span></td>
                  <td className="px-4 py-3 text-xs">{t.from}</td>
                  <td className="px-4 py-3 font-medium">{t.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.received}</td>
                  <td className="px-4 py-3 text-xs">{t.assignee}</td>
                  <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATE_BADGE[t.state]}`}>{t.state}</span></td>
                  <td className="px-4 py-3 text-center">
                    {t.state === "미배정" ? (
                      <button onClick={() => assign(t.id)} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm bg-accent text-white hover:bg-accent/90">
                        <UserCheck size={11} /> 담당 배정
                      </button>
                    ) : (
                      <button className="text-[11px] px-2.5 py-1 rounded-sm border border-border hover:border-accent hover:text-accent">답변 작성</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-border rounded-sm px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{r.id}</span>
                  <span className="text-xs font-medium">{r.popup}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                    {r.reason} · 신고 {r.reports}건
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">"{r.content}"</p>
              </div>
              <button
                onClick={() => toggleReview(r.id)}
                className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-sm border ${
                  r.visible ? "border-border hover:border-red-300 hover:text-red-500" : "border-red-200 bg-red-50 text-red-500"
                }`}
              >
                {r.visible ? <><Eye size={13} /> 노출중 → 숨기기</> : <><EyeOff size={13} /> 비노출 처리됨</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
