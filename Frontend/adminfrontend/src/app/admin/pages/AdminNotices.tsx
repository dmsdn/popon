import { useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { getBusinessAccounts, sendNoticeToBusiness, BusinessAccount, AdminNoticeResult } from "../../lib/api";

// 관리자 → 주최자 공지 발송 — 7/29 신설 (POST /api/admin/notices/business)
// 특정 주최자에게 공지를 보내면 주최자센터 벨 알림 수신함(notice_recipient)으로 전달된다.

export default function AdminNotices() {
  const [businesses, setBusinesses] = useState<BusinessAccount[]>([]);
  const [businessId, setBusinessId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState<AdminNoticeResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<AdminNoticeResult[]>([]); // 이번 세션 발송 이력 (조회 API 없음)

  useEffect(() => {
    let alive = true;
    getBusinessAccounts()
      .then((list) => {
        if (!alive) return;
        setBusinesses(list);
        if (list.length > 0) setBusinessId((prev) => prev || list[0].id);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "주최자 목록을 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, []);

  const selected = businesses.find((b) => b.id === businessId);

  const send = async () => {
    setError("");
    if (businessId === "") return setError("공지를 받을 주최자를 선택해 주세요.");
    if (!title.trim()) return setError("공지 제목을 입력해 주세요.");
    if (!content.trim()) return setError("공지 내용을 입력해 주세요.");
    if (!window.confirm(`「${selected?.companyName}」에게 공지를 발송할까요?\n발송 후에는 수정할 수 없습니다.`)) return;
    setSending(true);
    try {
      const res = await sendNoticeToBusiness({ businessId, title: title.trim(), content: content.trim() });
      setSentInfo(res);
      setHistory((prev) => [res, ...prev]);
      setTitle("");
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">주최자 공지 발송</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          선택한 주최자에게 운영 공지를 발송합니다. 주최자센터 벨 알림(수신함)으로 전달됩니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {sentInfo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3 text-xs text-emerald-700">
          <CheckCircle2 size={14} /> 발송 완료 — 「{sentInfo.title}」 · {sentInfo.sentAt.slice(5, 16).replace("T", " ")}
        </div>
      )}

      <div className="bg-white border border-border rounded-sm p-5 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">받는 주최자 *</label>
            <select
              className={inputCls}
              value={businessId}
              onChange={(e) => { setBusinessId(Number(e.target.value)); setSentInfo(null); }}
            >
              {businesses.length === 0 && <option value="">주최자 목록을 불러오는 중…</option>}
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.companyName} ({b.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">공지 제목 *</label>
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="예: 8월 정산 일정 안내"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">공지 내용 *</label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={inputCls + " resize-y leading-relaxed"}
            placeholder="발송 후에는 수정할 수 없습니다. 내용을 정확히 확인해 주세요."
          />
        </div>
        <div className="flex items-center justify-end pt-2 border-t border-border">
          <button
            onClick={send}
            disabled={sending || businessId === ""}
            className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-white hover:bg-accent/90 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 발송
          </button>
        </div>
      </div>

      <div className="bg-white border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
          <Megaphone size={14} className="text-muted-foreground" /> 발송 이력
          <span className="text-xs font-normal text-muted-foreground">— 이번 접속에서 보낸 공지 (전체 이력 조회 API는 백엔드 구성 후 연동)</span>
        </div>
        <ul className="divide-y divide-border">
          {history.length === 0 && (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">이번 접속에서 발송한 공지가 없습니다.</li>
          )}
          {history.map((h) => (
            <li key={h.id} className="px-4 py-3 flex items-center gap-4">
              <span className="shrink-0 text-[11px] text-muted-foreground w-24" style={{ fontFamily: "'DM Mono', monospace" }}>
                {h.sentAt.slice(5, 16).replace("T", " ")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{h.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{h.content}</div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{h.recipientCount.toLocaleString()}명 수신</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
