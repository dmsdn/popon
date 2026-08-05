import { useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { getMyPopups, sendPopupNotice, getPopupNotices, Popup, NoticeItem, NoticeTarget } from "../../lib/api";
import { restoreSelectedPopup, saveSelectedPopup } from "../../lib/popupSelection";

// 긴급공지 발송 — POST /api/popups/{id}/notices 실연동 (7/28)
// 발송 대상 선택 → 서버가 수신자 집계 후 소비자·주최자 수신함에 적재. 발송 이력도 서버 조회.

const TARGET_OPTIONS: { key: NoticeTarget; label: string }[] = [
  { key: "ALL_RESERVED", label: "예약자 전체" },
  { key: "TODAY_RESERVED", label: "당일 예약자" },
  { key: "ONSITE_WAITING", label: "웨이팅 등록자" },
  { key: "WISHLIST", label: "팝업 찜한 소비자" },
];
const TARGET_LABEL: Record<string, string> = Object.fromEntries(TARGET_OPTIONS.map((t) => [t.key, t.label]));

const fmt = (iso: string) => iso.slice(5, 16).replace("T", " ");

export default function Notices() {
  // 7/24 멘토 피드백: 제목 자유 입력 대신 "어느 팝업에 대한 공지인지"를 팝업명으로 강제
  const [myPopups, setMyPopups] = useState<Popup[]>([]);
  const [popupId, setPopupId] = useState("");
  const [targets, setTargets] = useState<NoticeTarget[]>(["ALL_RESERVED"]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState<NoticeItem | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<NoticeItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    getMyPopups()
      .then((all) => {
        // 공지를 보낼 수 있는 건 게시된 팝업(오픈예정·진행중)뿐 — 심사 대기·반려·종료는 제외
        const notifiable = all.filter((p) => p.status === "BEFOR" || p.status === "OPEN");
        setMyPopups(notifiable);
        // 8/5 — 다른 화면에서 고른 팝업이 게시 목록에 있으면 우선 복원
        const restored = restoreSelectedPopup(notifiable, notifiable[0] ? notifiable[0].id : null);
        setPopupId((prev) => prev || (restored != null ? String(restored) : ""));
      })
      .catch(() => setMyPopups([]));
  }, []);

  // 선택한 팝업의 발송 이력
  useEffect(() => {
    if (!popupId) { setHistory([]); return; }
    setHistoryLoading(true);
    getPopupNotices(popupId)
      .then((list) => setHistory([...list].sort((a, b) => b.sentAt.localeCompare(a.sentAt))))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [popupId, sentInfo]); // 발송 성공 시 이력 자동 갱신

  const toggleTarget = (key: NoticeTarget) =>
    setTargets((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));

  const selectedTitle = myPopups.find((p) => String(p.id) === popupId)?.title ?? "";

  // 8/5 — 마지막 선택을 기억해 명단·관제·성과에서도 같은 팝업이 잡히게 한다
  useEffect(() => { if (popupId) saveSelectedPopup(Number(popupId)); }, [popupId]);

  const send = async () => {
    setError("");
    if (!popupId) return setError("공지 대상 팝업을 선택해 주세요.");
    if (targets.length === 0) return setError("발송 대상을 1개 이상 선택해 주세요.");
    if (!content.trim()) return setError("공지 내용을 입력해 주세요.");
    if (!window.confirm(`「${selectedTitle}」 공지를 ${targets.map((t) => TARGET_LABEL[t]).join("·")}에게 발송할까요?\n발송 후에는 수정할 수 없습니다.`)) return;
    setSending(true);
    try {
      // 제목은 「[긴급공지] 팝업명」 형식으로 강제 (7/24 멘토 피드백)
      const res = await sendPopupNotice(popupId, {
        targets,
        title: `[긴급공지] ${selectedTitle}`,
        content: content.trim(),
      });
      setSentInfo(res);
      setContent("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  const inputCls = "w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">긴급공지 발송</h1>
        <p className="text-xs text-muted-foreground mt-0.5">기상악화·운영 변경 등 내 팝업 관련 긴급 공지를 수신함(앱)으로 즉시 발송합니다.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {sentInfo && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-sm px-4 py-3 text-xs text-emerald-700">
          <CheckCircle2 size={14} /> 발송 완료 — 수신 대상 {sentInfo.recipientCount.toLocaleString()}명 · {fmt(sentInfo.sentAt)}
        </div>
      )}

      <div className="bg-card border border-border rounded-sm p-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5">발송 대상 *</label>
          <div className="flex flex-wrap gap-2">
            {TARGET_OPTIONS.map((t) => (
              <label key={t.key} className="flex items-center gap-1.5 text-[13px] border border-border rounded-sm px-3 py-2 cursor-pointer has-[:checked]:border-accent has-[:checked]:text-accent has-[:checked]:bg-accent/5">
                <input
                  type="checkbox"
                  checked={targets.includes(t.key)}
                  onChange={() => toggleTarget(t.key)}
                  className="accent-[#E85D3C]"
                /> {t.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5">공지 대상 팝업 *</label>
          {/* 제목 자유 입력 제거 — 공지 제목은 선택한 팝업명으로 자동 지정 (7/24 멘토 피드백) */}
          <select className={inputCls} value={popupId} onChange={(e) => { setPopupId(e.target.value); setSentInfo(null); }}>
            {myPopups.length === 0 && <option value="">공지를 보낼 수 있는 게시중 팝업이 없습니다</option>}
            {myPopups.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">공지 제목은 「[긴급공지] 팝업명」 형식으로 자동 발송됩니다.</p>
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
            disabled={sending || !popupId}
            className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 즉시 발송
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-sm">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold flex items-center gap-2">
          <Megaphone size={14} className="text-muted-foreground" /> 발송 이력
          {selectedTitle && <span className="text-xs font-normal text-muted-foreground">— {selectedTitle}</span>}
        </div>
        <ul className="divide-y divide-border">
          {historyLoading && (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">
              <Loader2 size={13} className="inline animate-spin mr-1.5" /> 불러오는 중…
            </li>
          )}
          {!historyLoading && history.length === 0 && (
            <li className="px-4 py-8 text-center text-xs text-muted-foreground">발송한 공지가 없습니다.</li>
          )}
          {!historyLoading && history.map((h) => (
            <li key={h.id} className="px-4 py-3 flex items-center gap-4">
              <span className="shrink-0 text-[11px] text-muted-foreground w-24" style={{ fontFamily: "'DM Mono', monospace" }}>{fmt(h.sentAt)}</span>
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
