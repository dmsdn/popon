import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Search, Loader2, Info, CheckCircle2, XCircle, ShieldCheck, PauseCircle, Pencil, ChevronUp, ChevronDown, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getPopups, approvePopup, rejectPopup, getKeywords, Popup, PopupStatusCode, ApiError, Region } from "../../lib/api";
import { SUSPEND_MARKER, isSuspended } from "../../lib/adminPopupMeta";

// 플랫폼 전체 팝업 관리 (심사·게시중지·수정 통합)
// 심사·게시중지: 관리자 승인/반려/게시중지 API 실연동.
// 내용 수정은 7/29 기능 탈락 — 관리자는 게시중지만 하고, 수정은 주최자가 자기 수정페이지에서 재등록(심사 대기 복귀)한다.

const STATUS_LABEL: Record<PopupStatusCode, string> = {
  PENDING: "심사 대기",
  REJECTED: "반려",
  BEFOR: "오픈예정",
  OPEN: "진행중",
  CLOSED: "종료",
  SUSPENDED: "게시중지",
};

const STATUS_BADGE: Record<PopupStatusCode, string> = {
  PENDING: "bg-blue-50 text-blue-600 border-blue-200",
  REJECTED: "bg-red-50 text-red-500 border-red-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
  SUSPENDED: "bg-orange-50 text-orange-500 border-orange-200",
};

const FILTERS: ("전체" | PopupStatusCode)[] = ["전체", "PENDING", "REJECTED", "BEFOR", "OPEN", "CLOSED", "SUSPENDED"];

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function AdminPopups() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");
  // 7/29 — 카테고리(keyword) 필터 펼침 + 헤더 정렬 (null = 기본: 심사 대기 우선·최신순)
  const [catOpen, setCatOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [keywordMaster, setKeywordMaster] = useState<Region[]>([]);
  // 정렬 대상 컬럼 — 7/29 ID 추가
  type SortKey = "id" | "title" | "createdAt";
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [openReviewId, setOpenReviewId] = useState<number | null>(null); // 심사 확장 행
  const [reason, setReason] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getPopups()
      .then((all) => {
        if (!alive) return;
        // 심사 대기 우선, 이후 최근 등록순
        const sorted = [...all].sort((a, b) => {
          if ((a.status === "PENDING") !== (b.status === "PENDING")) return a.status === "PENDING" ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        });
        setPopups(sorted);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const handleAuthError = (e: unknown, fallback: string) => {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      alert("관리자 인증이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.");
      logout();
    } else {
      alert(e instanceof Error ? e.message : fallback);
    }
  };

  // 심사: 승인 / 반려
  const decide = async (p: Popup, action: "approve" | "reject") => {
    if (action === "reject" && !reason.trim()) {
      alert("반려 사유를 입력해 주세요. (주최자에게 전달됩니다)");
      return;
    }
    setActingId(p.id);
    try {
      const updated = action === "approve" ? await approvePopup(p.id) : await rejectPopup(p.id, reason.trim());
      setPopups((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      // 상태 확정일은 7/23부터 서버가 기록(popup.statusChangedAt) — 로컬 setMeta 제거
      setOpenReviewId(null);
      setReason("");
    } catch (e) {
      handleAuthError(e, "처리에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  // 게시중지 ↔ 게시재개 (반려 API를 [게시중지] 마커와 함께 재사용 → 소비자 화면에서 즉시 숨김)
  const toggleSuspend = async (p: Popup) => {
    const suspended = isSuspended(p.status, p.rejectReason);
    if (!window.confirm(suspended ? `「${p.title}」 게시를 재개할까요?` : `「${p.title}」 게시를 중지할까요? 소비자 화면에서 즉시 숨겨집니다.`)) return;
    setActingId(p.id);
    try {
      const updated = suspended
        ? await approvePopup(p.id)
        : await rejectPopup(p.id, `${SUSPEND_MARKER} 관리자에 의해 게시가 중지되었습니다.`);
      setPopups((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      // 상태 확정일은 서버 statusChangedAt이 기록
    } catch (e) {
      handleAuthError(e, "처리에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  useEffect(() => {
    getKeywords().then(setKeywordMaster).catch(() => {});
  }, []);

  // 첫 클릭 방향은 컬럼 성격에 맞춘다 — 이름은 가나다순(1), ID·등록일은 최신·큰 값 우선(-1)
  const toggleSort = (key: SortKey) =>
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "title" ? 1 : -1 }));

  const SortIcon = ({ col }: { col: SortKey }) =>
    sort?.key !== col ? <ArrowUpDown size={11} className="opacity-40" /> : sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;

  const rows = useMemo(() => {
    const filtered = popups.filter(
      (p) =>
        (filter === "전체" || p.status === filter) &&
        (catFilter === null || (p.keywordNames ?? []).includes(catFilter)) &&
        (q === "" || p.title.includes(q) || p.companyName.includes(q) || (p.location ?? "").includes(q)),
    );
    if (!sort) return filtered; // 기본 정렬(심사 대기 우선·최신순)은 로드 시점에 이미 적용됨
    return [...filtered].sort((a, b) => {
      // ID는 숫자라 localeCompare로 비교하면 "10"이 "9"보다 앞서므로 산술 비교해야 한다
      if (sort.key === "id") return (a.id - b.id) * sort.dir;
      if (sort.key === "title") return a.title.localeCompare(b.title, "ko") * sort.dir;
      return (a.createdAt ?? "").localeCompare(b.createdAt ?? "") * sort.dir;
    });
  }, [popups, filter, catFilter, q, sort]);

  const pendingCount = popups.filter((p) => p.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">팝업 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          전체 팝업 조회·심사·게시중지·수정을 한 화면에서 처리합니다. 심사 대기 {pendingCount}건
        </p>
      </div>

      {/* 상태 필터 + 검색 */}
      <div className="bg-card border border-border rounded-sm p-3 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = f === "전체" ? popups.length : popups.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f ? "bg-foreground text-primary-foreground border-foreground" : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {f === "전체" ? "전체" : STATUS_LABEL[f]} {count}
            </button>
          );
        })}
        {/* 카테고리 필터 펼치기 (7/29) */}
        <button
          onClick={() => setCatOpen((v) => !v)}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
            catFilter ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:border-foreground"
          }`}
        >
          <SlidersHorizontal size={11} /> 카테고리{catFilter ? `: ${catFilter}` : ""}
          {catOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        <div className="ml-auto relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="팝업명·브랜드·주소 검색"
            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm w-56 bg-card focus:outline-none focus:border-accent"
          />
        </div>

        {/* 카테고리(keyword 테이블) 필터 — 상태 필터 아래로 펼침 (7/29) */}
        {catOpen && (
          <div className="w-full pt-2 mt-1 border-t border-border flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setCatFilter(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${
                catFilter === null ? "bg-foreground text-primary-foreground border-foreground" : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              전체
            </button>
            {keywordMaster.map((k) => (
              <button
                key={k.id}
                onClick={() => setCatFilter(catFilter === k.name ? null : k.name)}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${
                  catFilter === k.name ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:border-accent"
                }`}
              >
                {k.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 목록 테이블 */}
      <div className="bg-card border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[960px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("id")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  ID <SortIcon col="id" />
                </button>
              </th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  팝업명 / 브랜드 <SortIcon col="title" />
                </button>
              </th>
              <th className="text-left font-medium px-4 py-2.5">운영 기간</th>
              <th className="text-left font-medium px-4 py-2.5">주소</th>
              <th className="text-left font-medium px-4 py-2.5">지역</th>
              <th className="text-left font-medium px-4 py-2.5">상태</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  등록일 <SortIcon col="createdAt" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </td>
              </tr>
            )}
            {!loading && rows.map((p) => {
              const suspended = isSuspended(p.status, p.rejectReason);
              const reviewed = !suspended && (p.status === "BEFOR" || p.status === "OPEN" || p.status === "CLOSED");
              const reviewable = !suspended && (p.status === "PENDING" || p.status === "REJECTED");
              const reviewOpen = openReviewId === p.id;
              return (
                <>
                  <tr key={p.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{p.id}</td>
                    <td className="px-4 py-3">
                      {/* 팝업명 클릭 → 상세페이지 (7/24 회의) */}
                      <Link to={`/admin/popups/${p.id}`} className="font-medium hover:text-accent hover:underline underline-offset-2 transition-colors">
                        {p.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{p.companyName}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}</td>
                    <td className="px-4 py-3 text-xs">{p.location ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">{p.regionName ?? "-"}</td>
                    <td className="px-4 py-3">
                      {suspended ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-white border-slate-800">게시중지</span>
                      ) : (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      )}
                      {p.status === "REJECTED" && !suspended && p.rejectReason && (
                        <div className="text-[11px] text-red-500 mt-1 max-w-[180px]">사유: {p.rejectReason}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDate(p.createdAt)}</td>
                    {/*<td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                         ① 심사 — 대기/반려 상태는 확장 심사, 승인 완료면 '심사완료'
                        {reviewable ? (
                          <button
                            onClick={() => { setOpenReviewId(reviewOpen ? null : p.id); setReason(""); }}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                              reviewOpen ? "border-accent text-accent bg-accent/5" : "border-border hover:border-accent hover:text-accent"
                            }`}
                          >
                            <ShieldCheck size={10} /> 심사 {reviewOpen ? <ChevronUp size={10} /> : null}
                          </button>
                        ) : (
                          <button
                            disabled
                            title={suspended ? "게시중지 상태에서는 심사할 수 없습니다" : "승인·게시가 완료된 팝업입니다"}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default"
                          >
                            <CheckCircle2 size={10} /> 심사완료
                          </button>
                        )}
                         ② 게시중지 토글 — 게시 상태(오픈예정/게시중)에서만 중지 가능
                        <button
                          onClick={() => toggleSuspend(p)}
                          disabled={actingId === p.id || (!suspended && !(p.status === "BEFOR" || p.status === "OPEN"))}
                          title={suspended ? "누르면 게시를 재개합니다" : "게시 상태의 팝업을 소비자 화면에서 숨깁니다"}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border transition-colors disabled:opacity-40 ${
                            suspended
                              ? "bg-slate-800 text-white border-slate-800 hover:bg-slate-700"
                              : "border-border hover:border-red-400 hover:text-red-500"
                          }`}
                        >
                          <PauseCircle size={10} /> {suspended ? "게시중지됨" : "게시중지"}
                        </button>
                         ③ 수정
                        <button
                          onClick={() => navigate(`/admin/popups/edit?id=${p.id}`)}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent"
                        >
                          <Pencil size={10} /> 수정
                        </button>
                      </div>
                    </td>*/}
                  </tr>

                  {/* 심사 확장 행 */}
                  {reviewOpen && (
                    <tr key={`review-${p.id}`} className="bg-secondary/30">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="flex flex-col gap-3 max-w-3xl">
                          <div className="bg-card border border-border rounded-sm p-3">
                            <div className="text-[11px] text-muted-foreground mb-1">소개글</div>
                            <div className="text-[13px] whitespace-pre-wrap">{p.description || "(소개글 없음)"}</div>
                          </div>
                          {p.status === "REJECTED" && p.rejectReason && (
                            <div className="bg-red-50 border border-red-200 rounded-sm px-3 py-2 text-xs text-red-600">
                              기존 반려 사유: {p.rejectReason}
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium mb-1.5">반려 사유 (반려 시 필수 · 주최자에게 전달됨)</label>
                              <input
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="예: 대표 이미지 화질 기준 미달"
                                className="w-full px-3 py-2 text-[13px] border border-border rounded-sm bg-card focus:outline-none focus:border-accent"
                              />
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => decide(p, "reject")}
                                disabled={actingId === p.id}
                                className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-sm border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 bg-card"
                              >
                                {actingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} 반려
                              </button>
                              <button
                                onClick={() => decide(p, "approve")}
                                disabled={actingId === p.id}
                                className="flex items-center gap-1.5 text-xs px-5 py-2.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {actingId === p.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} 승인·게시
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">조건에 맞는 팝업이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
