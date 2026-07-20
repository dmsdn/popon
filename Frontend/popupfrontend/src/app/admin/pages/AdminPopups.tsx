import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Search, Loader2, ShieldCheck, Info } from "lucide-react";
import { getPopups, Popup, PopupStatusCode } from "../../lib/api";

// 플랫폼에 등록된 전체 팝업 관리 (관리자용)
// 연동됨: 목록 조회·상태 필터·검색 (GET /api/popups 실데이터)
// 연동 필요: 관리자 권한의 팝업 강제 수정/게시중지/삭제 — 현재 백엔드는 주최자 본인만 수정/삭제 가능

const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "게시중",
  CLOSED: "종료",
};

const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
};

const FILTERS: ("전체" | PopupStatusCode)[] = ["전체", "PENDING", "REJECTED", "BEFOR", "OPEN", "CLOSED"];

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function AdminPopups() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    getPopups()
      .then((all) => {
        if (!alive) return;
        setPopups([...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const rows = popups.filter(
    (p) =>
      (filter === "전체" || p.status === filter) &&
      (q === "" || p.title.includes(q) || p.companyName.includes(q) || (p.location ?? "").includes(q)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">팝업 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">플랫폼에 등록된 전체 팝업을 조회·관리합니다. (심사 처리는 팝업 심사·게시 승인 메뉴)</p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          목록·필터·검색은 실데이터 연동 완료. 관리자 권한의 <strong>팝업 강제 수정·게시중지·삭제</strong>는
          백엔드에 관리자용 API가 없어 연동 필요 상태입니다 (현재는 주최자 본인만 수정/삭제 가능).
        </div>
      </div>

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
            placeholder="팝업명·브랜드·공간 검색"
            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm w-56 bg-white focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 목록 테이블 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[820px]">
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
                  {p.status === "REJECTED" && p.rejectReason && (
                    <div className="text-[11px] text-red-500 mt-1 max-w-[180px]">사유: {p.rejectReason}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{fmtDate(p.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <Link
                      to="/admin/review"
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent"
                      title="심사 화면으로 이동"
                    >
                      <ShieldCheck size={10} /> 심사
                    </Link>
                    <button
                      disabled
                      title="관리자용 수정/삭제 API 백엔드 구성 후 연동 필요"
                      className="text-[11px] px-2 py-1 rounded-sm border border-border text-muted-foreground opacity-40 cursor-not-allowed"
                    >
                      게시중지 (연동 필요)
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
