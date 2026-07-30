import { useEffect, useState } from "react";
import { FileText, Loader2, Save, Info } from "lucide-react";
import { getTerms, updateTerms, Terms } from "../../lib/api";

// 약관 관리 — 7/29 신설.
// PUT /api/admin/terms는 백엔드에 처음부터 있었는데(TermsController) 관리자 화면이 없어
// 약관을 고치려면 DB를 직접 만져야 했다. 여기서 고친 본문이 소비자·주최자 회원가입의
// "약관 보기"(공개 GET /api/terms)에 그대로 노출된다 — 저장 즉시 반영이니 미리보기로 확인 후 저장할 것.

export default function AdminTerms() {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    getTerms()
      .then((t) => {
        setTerms(t);
        setTitle(t.title);
        setContent(t.content);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "약관을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const dirty = terms !== null && (title !== terms.title || content !== terms.content);

  const save = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 본문을 모두 입력해 주세요.");
    if (!window.confirm("약관을 저장할까요?\n\n저장 즉시 소비자·주최자 회원가입 화면의 약관이 바뀝니다.")) return;
    setSaving(true);
    setSavedMsg("");
    try {
      const updated = await updateTerms(title.trim(), content);
      setTerms(updated);
      setSavedMsg(`저장되었습니다 (${updated.updatedAt.slice(0, 16).replace("T", " ")})`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold">약관 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          소비자·주최자 회원가입의 「약관 보기」에 노출되는 본문을 수정합니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      ) : terms && (
        <div className="bg-card border border-border rounded-sm">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText size={14} className="text-accent" /> 서비스 이용약관
            </span>
            <span className="text-[11px] text-muted-foreground">
              마지막 수정 {terms.updatedAt.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5">제목</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5">본문</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                className="w-full px-3 py-2.5 text-[13px] leading-relaxed border border-border rounded-sm bg-card focus:outline-none focus:border-accent resize-y"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Info size={11} /> 저장 즉시 회원가입 화면에 반영됩니다 — 되돌리기 기능이 없으니 저장 전 내용을 확인하세요.
              </p>
              <div className="flex items-center gap-3 shrink-0">
                {savedMsg && <span className="text-xs text-emerald-600">{savedMsg}</span>}
                <button
                  onClick={save}
                  disabled={saving || !dirty}
                  title={dirty ? "" : "변경된 내용이 없습니다"}
                  className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
