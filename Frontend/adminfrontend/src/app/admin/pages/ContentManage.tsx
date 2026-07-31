import { useEffect, useRef, useState } from "react";
import { Plus, Eye, EyeOff, Newspaper, Image as ImageIcon, Trash2, Loader2, Megaphone } from "lucide-react";
import {
  getAdminBanners, createBanner, updateBanner, deleteBanner, Banner,
  getAdminAnnouncements, createAnnouncement, deleteAnnouncement, Announcement,
} from "../../lib/api";

// 배너·공지 관리 — 7/28 실연동 (banner·announcement 백엔드는 7/27 jsw 신설)
// 배너: 소비자 홈 상단 캐러셀 / 공지 배너: 소비자 홈 공지줄
//
// 관리자가 '소비자에게 알리는' 창구는 이 화면의 공지 배너다 (announcement 테이블).
// 관리자 → 소비자 개별 공지 발송 API는 없고, 만들지 않는다 —
// 소비자 대상 안내는 전원이 보는 공지 배너로, 팝업별 안내는 주최자가
// 자기 예약자에게 보내는 긴급공지(POST /api/popups/{id}/notices)로 나뉘어 있다.
// 「주최자 공지 발송」(/admin/notices)은 주최자 1명에게 보내는 별개 화면.

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

const inputCls = "px-2.5 py-1.5 text-xs border border-border rounded-sm bg-card focus:outline-none focus:border-accent";

export default function ContentManage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null); // "banner:3" / "ann:1" — 두 목록 id 충돌 방지

  // 배너 추가 폼 — 7/29부터 URL 직접 입력이 아니라 파일 업로드 (백엔드가 multipart를 받는다)
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bForm, setBForm] = useState({ title: "", linkUrl: "" });
  const [bFile, setBFile] = useState<File | null>(null);
  const bFileRef = useRef<HTMLInputElement>(null);
  // 고른 파일 미리보기 — objectURL은 정리 함수에서 해제해야 메모리가 새지 않는다
  const [bPreview, setBPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!bFile) {
      setBPreview(null);
      return;
    }
    const url = URL.createObjectURL(bFile);
    setBPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bFile]);
  // 공지 추가 폼
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [aForm, setAForm] = useState({ title: "", content: "" });

  const load = () => {
    Promise.all([getAdminBanners(), getAdminAnnouncements()])
      .then(([bs, as_]) => {
        setBanners([...bs].sort((a, b) => a.sortOrder - b.sortOrder));
        setAnnouncements(as_);
        setError("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  // 배너 노출 토글 — 서버 PUT 후 응답으로 교체
  const toggleBanner = async (b: Banner) => {
    setActingId(`banner:${b.id}`);
    try {
      const updated = await updateBanner(b.id, { active: !b.active });
      setBanners((prev) => prev.map((x) => (x.id === b.id ? updated : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "변경에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const removeBanner = async (b: Banner) => {
    if (!window.confirm(`배너 「${b.title}」를 삭제할까요?`)) return;
    setActingId(`banner:${b.id}`);
    try {
      await deleteBanner(b.id);
      setBanners((prev) => prev.filter((x) => x.id !== b.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const submitBanner = async () => {
    if (!bForm.title.trim()) return alert("배너 제목을 입력해 주세요.");
    if (!bFile) return alert("배너 이미지 파일을 선택해 주세요.");
    setActingId("banner:new");
    try {
      const created = await createBanner(bFile, {
        title: bForm.title.trim(),
        linkUrl: bForm.linkUrl.trim() || undefined,
        sortOrder: banners.length + 1,
      });
      setBanners((prev) => [...prev, created]);
      setBForm({ title: "", linkUrl: "" });
      setBFile(null);
      if (bFileRef.current) bFileRef.current.value = ""; // 같은 파일을 다시 고를 수 있게 비운다
      setShowBannerForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const removeAnn = async (a: Announcement) => {
    if (!window.confirm(`공지 「${a.title}」를 내릴까요?`)) return;
    setActingId(`ann:${a.id}`);
    try {
      await deleteAnnouncement(a.id);
      setAnnouncements((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const submitAnn = async () => {
    if (!aForm.title.trim()) return alert("공지 제목을 입력해 주세요.");
    setActingId("ann:new");
    try {
      const created = await createAnnouncement({ title: aForm.title.trim(), content: aForm.content.trim() || undefined });
      setAnnouncements((prev) => [created, ...prev]);
      setAForm({ title: "", content: "" });
      setShowAnnForm(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "등록에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div>
        <h1 className="text-lg font-semibold">배너·공지 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          소비자 서비스 홈의 메인 배너와 공지 배너 노출을 관리합니다. 소비자에게 알릴 내용은 공지 배너로 게시됩니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}
      {loading && (
        <div className="text-center text-xs text-muted-foreground py-10">
          <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
        </div>
      )}

      {!loading && (
        <>
          {/* 메인 배너 */}
          <div className="bg-card border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon size={14} className="text-muted-foreground" /> 메인 배너 <span className="text-xs font-normal text-muted-foreground">{banners.length}건</span>
              </span>
              <button
                onClick={() => setShowBannerForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus size={12} /> 배너 추가
              </button>
            </div>

            {showBannerForm && (
              <div className="px-4 py-3 border-b border-border bg-secondary/40 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                  제목 *
                  <input className={inputCls + " w-52"} value={bForm.title} onChange={(e) => setBForm((p) => ({ ...p, title: e.target.value }))} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground flex-1 min-w-[240px]">
                  배너 이미지 * <span className="normal-case">(JPG·PNG · 서버가 1080×1440으로 변환)</span>
                  <div className="flex items-center gap-2">
                    <input
                      ref={bFileRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => setBFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bFileRef.current?.click()}
                      className={inputCls + " flex-1 min-w-0 text-left truncate hover:border-accent"}
                    >
                      {bFile ? bFile.name : "클릭하여 파일 선택"}
                    </button>
                    {bPreview && (
                      <img src={bPreview} alt="" className="w-12 h-9 object-cover rounded-sm border border-border shrink-0" />
                    )}
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground w-44">
                  링크 URL (선택)
                  <input className={inputCls} value={bForm.linkUrl} onChange={(e) => setBForm((p) => ({ ...p, linkUrl: e.target.value }))} />
                </label>
                <button onClick={submitBanner} disabled={actingId === "banner:new"} className="text-xs px-4 py-2 rounded-sm bg-foreground text-primary-foreground disabled:opacity-50">
                  {actingId === "banner:new" ? "등록 중…" : "등록"}
                </button>
              </div>
            )}

            <ul className="divide-y divide-border">
              {banners.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">등록된 배너가 없습니다.</li>
              )}
              {banners.map((b, i) => (
                <li key={b.id} className={`px-4 py-3 flex items-center gap-3 ${!b.active ? "opacity-50" : ""}`}>
                  <span className="w-6 h-6 rounded-sm bg-secondary flex items-center justify-center text-xs font-semibold shrink-0" style={{ fontFamily: "'DM Mono', monospace" }}>{i + 1}</span>
                  {/* 배너 이미지 미리보기 */}
                  <img src={b.imageUrl} alt="" className="w-16 h-9 object-cover rounded-sm border border-border shrink-0 bg-secondary" onError={(e) => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{b.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      노출: {fmtDate(b.startDate)} ~ {fmtDate(b.endDate)}{b.linkUrl ? ` · ${b.linkUrl}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBanner(b)}
                    disabled={actingId === `banner:${b.id}`}
                    className={`shrink-0 flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-sm border disabled:opacity-40 ${
                      b.active ? "border-emerald-200 text-emerald-600 bg-emerald-50" : "border-border text-muted-foreground"
                    }`}
                  >
                    {b.active ? <><Eye size={11} /> 노출중</> : <><EyeOff size={11} /> 숨김</>}
                  </button>
                  <button
                    onClick={() => removeBanner(b)}
                    disabled={actingId === `banner:${b.id}`}
                    className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                    title="배너 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 공지 배너 (소비자 홈 공지줄) */}
          <div className="bg-card border border-border rounded-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Megaphone size={14} className="text-muted-foreground" /> 공지 배너 <span className="text-xs font-normal text-muted-foreground">{announcements.length}건</span>
              </span>
              <button
                onClick={() => setShowAnnForm((v) => !v)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent"
              >
                <Plus size={12} /> 공지 등록
              </button>
            </div>

            {showAnnForm && (
              <div className="px-4 py-3 border-b border-border bg-secondary/40 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground w-64">
                  제목 *
                  <input className={inputCls} value={aForm.title} onChange={(e) => setAForm((p) => ({ ...p, title: e.target.value }))} />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground flex-1 min-w-[200px]">
                  내용 (선택)
                  <input className={inputCls} value={aForm.content} onChange={(e) => setAForm((p) => ({ ...p, content: e.target.value }))} />
                </label>
                <button onClick={submitAnn} disabled={actingId === "ann:new"} className="text-xs px-4 py-2 rounded-sm bg-foreground text-primary-foreground disabled:opacity-50">
                  {actingId === "ann:new" ? "등록 중…" : "등록"}
                </button>
              </div>
            )}

            <ul className="divide-y divide-border">
              {announcements.length === 0 && (
                <li className="px-4 py-8 text-center text-xs text-muted-foreground">노출 중인 공지가 없습니다.</li>
              )}
              {announcements.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{a.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{a.content || "-"} · 등록 {fmtDate(a.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => removeAnn(a)}
                    disabled={actingId === `ann:${a.id}`}
                    className="shrink-0 text-muted-foreground hover:text-red-500 disabled:opacity-40"
                    title="공지 내리기"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
            <Newspaper size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 leading-relaxed">
              배너·공지는 소비자 홈에 즉시 반영됩니다. 매거진·뉴스레터 발행 기능은 범위에서 제외되었습니다.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
