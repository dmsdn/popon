import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { ArrowLeft, Info, Loader2, CheckCircle2 } from "lucide-react";
import { getPopup, Popup } from "../../lib/api";
import { getMeta, setMeta, today } from "../../lib/adminPopupMeta";

// 관리자용 팝업 수정 페이지 (주최자 수정 폼과 동일 항목 + 수정사항·사유 필수)
// ※ 수정사항·사유는 주최자센터 팝업 조회/수정 화면에 즉시 표시됨.
//   팝업 내용의 DB 실반영은 관리자용 수정 API(PUT /api/admin/popups/{id}) 백엔드 구성 후 연동.

const inputCls =
  "w-full px-3 py-2.5 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent";

const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : "");

export default function AdminPopupEdit() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();

  const [popup, setPopup] = useState<Popup | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", location: "", startDate: "", endDate: "" });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPopup(id)
      .then((p) => {
        setPopup(p);
        setForm({
          title: p.title,
          description: p.description ?? "",
          location: p.location ?? "",
          startDate: toLocalInput(p.startDate),
          endDate: toLocalInput(p.endDate),
        });
        setNote(getMeta(p.id).editNote ?? "");
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "팝업을 불러오지 못했습니다."));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popup) return;
    if (!note.trim()) {
      alert("수정사항 및 사유를 입력해 주세요. (주최자에게 전달됩니다)");
      return;
    }
    setSaving(true);
    // 수정사항·사유 기록 → 주최자센터 팝업 조회/수정 화면에 표시
    setMeta(popup.id, { editNote: note.trim(), editDate: today(), statusDate: today() });
    setSaving(false);
    setDone(true);
  };

  if (!id) {
    return (
      <div className="text-xs text-muted-foreground">
        잘못된 접근입니다. <Link to="/admin/popups" className="text-accent underline">팝업 관리로 돌아가기</Link>
      </div>
    );
  }
  if (loadError) {
    return <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{loadError}</div>;
  }
  if (!popup) {
    return (
      <div className="text-center text-xs text-muted-foreground py-10">
        <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-xl bg-card border border-border rounded-sm p-8 text-center">
        <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
        <div className="text-base font-semibold mb-1.5">수정이 완료되었습니다</div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-5">
          수정사항 및 사유가 주최자센터(팝업 조회/수정)에 표시됩니다.<br />
          팝업 내용의 실제 반영은 관리자용 수정 API 백엔드 구성 후 적용됩니다.
        </p>
        <button onClick={() => navigate("/admin/popups")} className="text-xs px-5 py-2.5 rounded-sm bg-foreground text-primary-foreground hover:bg-foreground/90">
          팝업 관리로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/popups")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">팝업 수정 (관리자)</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            PU-{String(popup.id).padStart(4, "0")} · {popup.companyName}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          수정 완료 시 <strong>수정사항 및 사유가 주최자에게 전달</strong>됩니다.
          팝업 내용(제목·소개글 등)의 DB 실반영은 관리자용 수정 API가 백엔드에 없어 <strong>백엔드 구성 후 연동 필요</strong>합니다.
        </div>
      </div>

      <form onSubmit={submit} className="bg-card border border-border rounded-sm p-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">팝업명 *</span>
          <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">소개글 *</span>
          <textarea
            required rows={5} value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className={inputCls + " resize-y"}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">공간(위치)</span>
          <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className={inputCls} />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">운영 시작</span>
            <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">운영 종료</span>
            <input type="datetime-local" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className={inputCls} />
          </label>
        </div>

        {/* 관리자 전용: 수정사항 및 사유 (필수) + 수정완료 */}
        <div className="border-t border-border pt-4 mt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <label className="flex-1 flex flex-col gap-1.5">
              <span className="text-xs font-medium">
                수정사항 및 사유 <span className="text-red-500">*</span>
                <span className="font-normal text-muted-foreground"> — 주최자 팝업 조회/수정 화면에 표시됩니다</span>
              </span>
              <textarea
                required rows={3} value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 소개글 내 과장 표현 수정 (허위·과장 광고 방지 정책), 운영 종료 시간 오기재 정정"
                className={inputCls + " resize-y"}
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="shrink-0 flex items-center justify-center gap-1.5 text-xs px-6 py-3 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 수정완료
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
