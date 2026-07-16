import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getPopups, deletePopup, Popup, PopupStatusCode } from "../../lib/api";

// 백엔드 PopupStatus(BEFOR/OPEN/CLOSED) → 화면 표기
const STATUS_LABEL: Record<PopupStatusCode, string> = {
  BEFOR: "오픈예정",
  OPEN: "게시중",
  CLOSED: "종료",
};

const STATUS_BADGE: Record<PopupStatusCode, string> = {
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
};

const FILTERS: ("전체" | PopupStatusCode)[] = ["전체", "BEFOR", "OPEN", "CLOSED"];

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function PopupList() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getPopups()
      .then((all) => {
        if (!alive) return;
        // 조회 API는 전체 팝업을 반환하므로 내(로그인한 사업자) 팝업만 필터링
        setPopups(user ? all.filter((p) => p.businessId === user.businessId) : all);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user]);

  const handleDelete = async (p: Popup) => {
    if (!window.confirm(`「${p.title}」 팝업을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(p.id);
    try {
      await deletePopup(p.id);
      setPopups((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const rows = popups.filter(
    (p) =>
      (filter === "전체" || p.status === filter) &&
      (q === "" || p.title.includes(q) || p.companyName.includes(q)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">팝업 조회/수정</h1>
          <p className="text-xs text-muted-foreground mt-0.5">등록한 팝업의 게시 상태를 확인하고 수정합니다.</p>
        </div>
        <Link to="/seller/popups/new" className="text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90">+ 새 팝업 등록</Link>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          로그인하지 않아 내 팝업을 구분할 수 없습니다. <Link to="/login" state={{ from: "/seller/popups" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      )}

      {/* 상태 필터 + 검색 */}
      <div className="bg-white border border-border rounded-sm p-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = f === "전체" ? popups.length : popups.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f ? "bg-foreground text-white border-foreground" : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {f === "전체" ? "전체" : STATUS_LABEL[f]} {count}
            </button>
          );
        })}
        <div className="ml-auto relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="팝업명·브랜드 검색"
            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm w-52 bg-white focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>
      )}

      {/* 목록 테이블 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">팝업명 / 브랜드</th>
              <th className="text-left font-medium px-4 py-2.5">운영 기간</th>
              <th className="text-left font-medium px-4 py-2.5">공간</th>
              <th className="text-left font-medium px-4 py-2.5">상태</th>
              <th className="text-left font-medium px-4 py-2.5">등록일</th>
              <th className="text-center font-medium px-4 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </td>
              </tr>
            )}
            {!loading && rows.map((p) => (
              <tr key={p.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{p.id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">{p.companyName}</div>
                </td>
                <td className="px-4 py-3 text-xs">{fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}</td>
                <td className="px-4 py-3 text-xs">{p.location ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                </td>
                <td className="px-4 py-3 text-xs">{fmtDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Link to={`/seller/popups/new?id=${p.id}`} title="수정" className="hover:text-foreground"><Pencil size={14} /></Link>
                    <button
                      title="삭제"
                      disabled={deletingId === p.id}
                      onClick={() => handleDelete(p)}
                      className="hover:text-red-500 disabled:opacity-40"
                    >
                      {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">조건에 맞는 팝업이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
