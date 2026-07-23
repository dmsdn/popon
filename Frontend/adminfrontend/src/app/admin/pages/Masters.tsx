import { useEffect, useState } from "react";
import { Plus, MapPin, Tags, Pencil, Trash2, Loader2, Info } from "lucide-react";
import { getVenues, createVenue, updateVenue, deleteVenue, Venue } from "../../lib/api";

// 공간(대관처) 마스터 — /api/admin/venues CRUD 실데이터 연동
// 카테고리·태그 마스터는 백엔드 API 구성 후 연동 (목업 유지)

const CATEGORIES = [
  { name: "패션", tags: 24, popups: 11 },
  { name: "뷰티", tags: 18, popups: 8 },
  { name: "F&B", tags: 31, popups: 12 },
  { name: "캐릭터", tags: 27, popups: 9 },
  { name: "라이프스타일", tags: 15, popups: 5 },
  { name: "아트", tags: 12, popups: 2 },
  { name: "테크", tags: 9, popups: 1 },
];

const EMPTY_FORM = { name: "", address: "", areaSqm: "", rentalFee: "", description: "" };

export default function Masters() {
  const [tab, setTab] = useState<"spaces" | "categories">("spaces");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null); // null=신규
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    getVenues()
      .then((v) => setVenues(v))
      .catch((e) => setError(e instanceof Error ? e.message : "공간 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (v: Venue) => {
    setEditId(v.id);
    setForm({
      name: v.name,
      address: v.address,
      areaSqm: v.areaSqm != null ? String(v.areaSqm) : "",
      rentalFee: v.rentalFee != null ? String(v.rentalFee) : "",
      description: v.description ?? "",
    });
    setFormOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
      rentalFee: form.rentalFee ? Number(form.rentalFee) : undefined,
      description: form.description.trim() || undefined,
    };
    try {
      if (editId == null) {
        const created = await createVenue(payload);
        setVenues((prev) => [...prev, created]);
      } else {
        const updated = await updateVenue(editId, payload);
        setVenues((prev) => prev.map((x) => (x.id === editId ? updated : x)));
      }
      setFormOpen(false);
      setForm(EMPTY_FORM);
      setEditId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (v: Venue) => {
    setActingId(v.id);
    try {
      const updated = await updateVenue(v.id, { status: v.status === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE" });
      setVenues((prev) => prev.map((x) => (x.id === v.id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "상태 변경에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const remove = async (v: Venue) => {
    if (!window.confirm(`「${v.name}」 공간을 삭제할까요?`)) return;
    setActingId(v.id);
    try {
      await deleteVenue(v.id);
      setVenues((prev) => prev.filter((x) => x.id !== v.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const inputCls = "px-3 py-2 text-[13px] border border-border rounded-sm bg-white focus:outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">공간·카테고리 마스터 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">전체 팝업에 공통 적용되는 대관 공간 DB와 카테고리·태그를 관리합니다.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {([["spaces", "공간(대관처) DB", MapPin], ["categories", "카테고리·태그", Tags]] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 text-[13px] px-4 py-2.5 border-b-2 -mb-px transition-colors ${
              tab === k ? "border-accent text-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "spaces" && (
        <>
          {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

          <div className="bg-white border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">등록된 공간 {venues.length}곳</span>
              <button onClick={openCreate} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-sm bg-accent text-white hover:bg-accent/90">
                <Plus size={12} /> 공간 등록
              </button>
            </div>

            {formOpen && (
              <form onSubmit={submit} className="px-4 py-3 border-b border-border bg-secondary/40 grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground lg:col-span-1">
                  공간명 *
                  <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground lg:col-span-1">
                  주소 *
                  <input required value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  면적(㎡)
                  <input type="number" min={0} value={form.areaSqm} onChange={(e) => setForm((p) => ({ ...p, areaSqm: e.target.value }))} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  일 대관료(원)
                  <input type="number" min={0} value={form.rentalFee} onChange={(e) => setForm((p) => ({ ...p, rentalFee: e.target.value }))} className={inputCls} />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="text-xs px-4 py-2 rounded-sm bg-foreground text-white hover:bg-foreground/90 disabled:opacity-50">
                    {saving ? "저장 중…" : editId == null ? "등록" : "수정 저장"}
                  </button>
                  <button type="button" onClick={() => setFormOpen(false)} className="text-xs px-3 py-2 rounded-sm border border-border">취소</button>
                </div>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-2 lg:col-span-5">
                  시설·설명
                  <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="예: 전기 3kW · 급수 · 하역장" className={inputCls} />
                </label>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[760px]">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5">공간명</th>
                    <th className="text-left font-medium px-4 py-2.5">주소</th>
                    <th className="text-right font-medium px-4 py-2.5">면적</th>
                    <th className="text-right font-medium px-4 py-2.5">일 대관료</th>
                    <th className="text-left font-medium px-4 py-2.5">시설·설명</th>
                    <th className="text-center font-medium px-4 py-2.5">상태</th>
                    <th className="text-center font-medium px-4 py-2.5">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground"><Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…</td></tr>
                  )}
                  {!loading && venues.length === 0 && !error && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">등록된 공간이 없습니다. 「공간 등록」으로 추가해 주세요.</td></tr>
                  )}
                  {venues.map((v) => (
                    <tr key={v.id} className="hover:bg-secondary/40">
                      <td className="px-4 py-3 font-medium">{v.name}</td>
                      <td className="px-4 py-3 text-xs">{v.address}</td>
                      <td className="px-4 py-3 text-xs text-right">{v.areaSqm != null ? `${v.areaSqm}㎡` : "-"}</td>
                      <td className="px-4 py-3 text-xs text-right">{v.rentalFee != null ? `${Number(v.rentalFee).toLocaleString()}원` : "-"}</td>
                      <td className="px-4 py-3 text-xs">{v.description ?? "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleStatus(v)}
                          disabled={actingId === v.id}
                          title="클릭하면 대관 가능/불가를 전환합니다"
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors disabled:opacity-40 ${
                            v.status === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {v.status === "AVAILABLE" ? "대관 가능" : "대관 불가"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <button title="수정" onClick={() => openEdit(v)} className="hover:text-foreground"><Pencil size={14} /></button>
                          <button title="삭제" disabled={actingId === v.id} onClick={() => remove(v)} className="hover:text-red-500 disabled:opacity-40">
                            {actingId === v.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "categories" && (
        <>
          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              카테고리·태그 마스터 API가 아직 백엔드에 없습니다 — <strong>백엔드 구성 후 연동 필요</strong> (아래는 목업).
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c) => (
              <div key={c.name} className="bg-white border border-border rounded-sm p-4">
                <div className="text-sm font-semibold mb-1">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">태그 {c.tags}개 · 사용 중 팝업 {c.popups}개</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
