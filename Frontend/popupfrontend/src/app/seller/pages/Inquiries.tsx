import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Loader2, Send, ChevronDown, ChevronUp, CheckCircle2, Plus, Trash2, RotateCcw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createInquiry, getMyInquiries, InquiryItem } from "../../lib/api";

// 주최자 문의하기 — POST /api/inquiries, GET /api/inquiries/my (관리자 답변 확인)

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  ANSWERED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};
const STATUS_LABEL: Record<string, string> = { PENDING: "답변 대기", ANSWERED: "답변 완료" };
const fmt = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

// 삭제한 문의 id — 백엔드에 DELETE API가 없어 내 목록에서만 숨김 (관리자 화면에는 남음)
const HIDDEN_KEY = "sellerHiddenInquiries";
const loadHidden = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]");
  } catch {
    return [];
  }
};

export default function Inquiries() {
  const { user } = useAuth();
  const isBusiness = user?.role === "business";

  const [list, setList] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<number[]>(loadHidden);

  // 답변 대기 문의 삭제 — 서버 DELETE API 미구현이라 내 목록에서 숨김 처리
  const handleDelete = (r: InquiryItem) => {
    if (!window.confirm(`「${r.title}」 문의를 삭제할까요?\n(서버 삭제 API 미구현 — 내 목록에서만 제거되며 관리자 화면에는 남습니다)`)) return;
    const ids = [...new Set([...hiddenIds, r.id])];
    setHiddenIds(ids);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
    if (openId === r.id) setOpenId(null);
  };

  // 재문의 — 7/25 피드백: 새 섹션을 만들지 않고 원 문의 스레드 안에서 아래로 이어짐.
  // 서버에는 여전히 "RE: 원제목"의 별도 문의로 저장되고(관리자 화면 호환), 이 화면이 제목 기준으로 묶어 보여준다.
  const [reaskFor, setReaskFor] = useState<number | null>(null); // 재문의 입력창이 열린 스레드의 root id
  const [reaskText, setReaskText] = useState("");
  const [reaskSaving, setReaskSaving] = useState(false);
  const submitReask = async (rootTitle: string) => {
    if (!reaskText.trim()) return;
    setReaskSaving(true);
    try {
      const created = await createInquiry({ title: `RE: ${rootTitle}`, content: reaskText.trim() });
      setList((prev) => [created, ...prev]);
      setReaskText("");
      setReaskFor(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "재문의 등록에 실패했습니다.");
    } finally {
      setReaskSaving(false);
    }
  };

  // 주최자 팝업 조회 표의 「문의」 버튼 → ?popup=팝업명 으로 진입 시 폼 자동 오픈 + 제목 프리필
  const [searchParams] = useSearchParams();
  const popupParam = searchParams.get("popup");
  useEffect(() => {
    if (!popupParam) return;
    setFormOpen(true);
    setForm((p) => (p.title ? p : { ...p, title: `[${popupParam}] ` }));
  }, [popupParam]);

  useEffect(() => {
    if (!isBusiness) {
      setLoading(false);
      return;
    }
    getMyInquiries()
      .then((l) => setList([...l].sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
      .catch((e) => setError(e instanceof Error ? e.message : "문의 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [isBusiness]);

  // "RE: " 접두어(중첩 포함)를 벗겨 원 제목을 얻고, 그 기준으로 문의들을 한 스레드로 묶는다
  const rootTitleOf = (t: string) => t.replace(/^(RE:\s*)+/, "");
  type Thread = { root: InquiryItem; items: InquiryItem[] }; // items = 원 문의 포함 시간순 전체
  const threads = useMemo<Thread[]>(() => {
    const visible = list.filter((r) => !hiddenIds.includes(r.id));
    const map = new Map<string, InquiryItem[]>();
    for (const r of visible) {
      const key = rootTitleOf(r.title);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return [...map.values()]
      .map((items) => {
        items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return { root: items[0], items };
      })
      // 스레드 정렬은 마지막 활동(최신 재문의·문의) 기준 내림차순
      .sort((a, b) => b.items[b.items.length - 1].createdAt.localeCompare(a.items[a.items.length - 1].createdAt));
  }, [list, hiddenIds]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createInquiry({ title: form.title.trim(), content: form.content.trim() });
      setList((prev) => [created, ...prev]);
      setForm({ title: "", content: "" });
      setFormOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "문의 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!isBusiness) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">관리자에게 문의하기</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          주최자(사업자) 계정으로 로그인해야 사용할 수 있습니다.{" "}
          <Link to="/login" state={{ from: "/seller/inquiries" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">관리자에게 문의하기</h1>
          <p className="text-xs text-muted-foreground mt-0.5">정산·계약·운영 관련 문의를 남기면 플랫폼 관리자가 답변합니다.</p>
        </div>
        <button onClick={() => setFormOpen((v) => !v)} className="flex items-center gap-1 text-xs px-3 py-2 rounded-sm bg-accent text-white hover:bg-accent/90">
          <Plus size={12} /> 새 문의
        </button>
      </div>

      {formOpen && (
        <form onSubmit={submit} className="bg-white border border-border rounded-sm p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">제목 *</span>
            <input
              required value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="예: 6월 정산서 세부 항목 문의"
              className="px-3 py-2 text-[13px] border border-border rounded-sm focus:outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">내용 *</span>
            <textarea
              required rows={4} value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="문의 내용을 자세히 적어주세요."
              className="px-3 py-2 text-[13px] border border-border rounded-sm resize-y focus:outline-none focus:border-accent"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="text-xs px-3 py-2 rounded-sm border border-border">취소</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-xs px-5 py-2 rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 문의 등록
            </button>
          </div>
        </form>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {!loading && list.length === 0 && !error && (
          <div className="bg-white border border-border rounded-sm px-4 py-10 text-center text-xs text-muted-foreground">
            등록한 문의가 없습니다. 「새 문의」로 남겨보세요.
          </div>
        )}
        {/* 스레드 단위 렌더링 — 재문의(RE:)는 새 섹션이 아니라 원 문의 아래로 이어짐 (7/25 피드백) */}
        {threads.map(({ root, items }) => {
          const open = openId === root.id;
          const last = items[items.length - 1];
          return (
            <div key={root.id} className="bg-white border border-border rounded-sm">
              <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left" onClick={() => setOpenId(open ? null : root.id)}>
                {/* 스레드 상태 = 마지막 문의의 상태 (재문의 후에는 다시 '답변 대기') */}
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[last.status]}`}>{STATUS_LABEL[last.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{rootTitleOf(root.title)}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    접수 {fmt(root.createdAt)}
                    {items.length > 1 && ` · 재문의 ${items.length - 1}건`}
                  </div>
                </div>
                {open ? <ChevronUp size={15} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={15} className="shrink-0 text-muted-foreground" />}
              </button>
              {open && (
                <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                  {items.map((r, idx) => (
                    <div key={r.id} className="flex flex-col gap-3">
                      {idx > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-accent pt-1">
                          <RotateCcw size={11} /> 재문의 · {fmt(r.createdAt)}
                        </div>
                      )}
                      <div className="bg-secondary/60 rounded-sm p-3 text-[13px] whitespace-pre-wrap">{r.content}</div>
                      {r.status === "ANSWERED" && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1.5">
                            <CheckCircle2 size={12} /> 관리자 답변 · {fmt(r.answeredAt)}
                          </div>
                          <p className="text-[13px] text-emerald-900 whitespace-pre-wrap">{r.answerContent}</p>
                        </div>
                      )}
                    </div>
                  ))}

                  {last.status === "ANSWERED" ? (
                    reaskFor === root.id ? (
                      <div className="flex flex-col gap-2 border-t border-border pt-3">
                        <textarea
                          rows={3} value={reaskText} autoFocus
                          onChange={(e) => setReaskText(e.target.value)}
                          placeholder="추가로 궁금한 내용을 적어주세요. 이 스레드 아래에 이어집니다."
                          className="px-3 py-2 text-[13px] border border-border rounded-sm resize-y focus:outline-none focus:border-accent"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setReaskFor(null); setReaskText(""); }}
                            className="text-xs px-3 py-1.5 rounded-sm border border-border"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => submitReask(rootTitleOf(root.title))}
                            disabled={reaskSaving || !reaskText.trim()}
                            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                          >
                            {reaskSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} 재문의 등록
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setReaskFor(root.id); setReaskText(""); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border border-accent/40 text-accent hover:bg-accent/5"
                        >
                          <RotateCcw size={12} /> 재문의
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground">관리자 확인 후 답변이 등록됩니다.</p>
                      {items.length === 1 && (
                        <button
                          onClick={() => handleDelete(root)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border border-border text-muted-foreground hover:border-red-300 hover:text-red-500"
                        >
                          <Trash2 size={12} /> 삭제
                        </button>
                      )}
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
