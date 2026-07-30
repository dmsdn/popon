import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search, Pencil, Loader2, ShieldAlert, ChevronDown, ChevronUp, MessageSquare, CheckCircle2, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getPopups, getMyPopups, getMyInquiries, getKeywords, Popup, PopupStatusCode, InquiryItem, IdName } from "../../lib/api";
import { loadAllMeta, isSuspended } from "../../lib/adminPopupMeta";

// 백엔드 PopupStatus → 화면 표기 (등록 직후 PENDING, 관리자 승인 시 BEFOR, 반려 시 REJECTED)
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
  OPEN: "bg-emerald-50 text-emerald-600 border-emerald-200",
  BEFOR: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-slate-100 text-slate-400 border-slate-200",
  SUSPENDED: "bg-orange-50 text-orange-500 border-orange-200",
};

const FILTERS: ("전체" | PopupStatusCode)[] = ["전체", "PENDING", "REJECTED", "BEFOR", "OPEN", "CLOSED", "SUSPENDED"];

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function PopupList() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("전체");
  const [q, setQ] = useState("");
  // 7/29 — 카테고리(keyword) 필터: 상태 필터 아래로 펼침. 정렬: 표 헤더 화살표 (가나다·최신순)
  const [catOpen, setCatOpen] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null); // keyword 이름 (null = 전체)
  const [keywordMaster, setKeywordMaster] = useState<IdName[]>([]);
  const [sort, setSort] = useState<{ key: "title" | "createdAt"; dir: 1 | -1 }>({ key: "createdAt", dir: -1 }); // 기본 최신순
  const [popups, setPopups] = useState<Popup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 관리자 수정 이력(수정사항·사유, 상태 확정일) — 관리자 콘솔에서 기록한 값
  const [adminMeta] = useState(loadAllMeta);
  const [openAdminEditId, setOpenAdminEditId] = useState<number | null>(null);
  // 이 팝업 관련 문의(제목의 [팝업명] 태그로 매칭) 중 답변 완료된 것 — 문의답변완료 버튼·확장
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [openInqPopupId, setOpenInqPopupId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    // 사업자 로그인 시 내 팝업 전용 API(심사 상태 포함), 미로그인 시 전체 조회로 폴백
    const fetchList = user?.role === "business" ? getMyPopups() : getPopups();
    fetchList
      .then((all) => {
        if (!alive) return;
        setPopups(all);
        setError("");
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "팝업 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    if (user?.role === "business") {
      getMyInquiries()
        .then((l) => alive && setInquiries(l))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [user]);

  // 카테고리 필터 선택지 (keyword 마스터) — 펼칠 때 필요하므로 1회 로드
  useEffect(() => {
    getKeywords().then(setKeywordMaster).catch(() => {});
  }, []);

  // 헤더 화살표 클릭: 같은 컬럼이면 방향 반전, 다른 컬럼이면 그 컬럼 기본 방향으로
  const toggleSort = (key: "title" | "createdAt") =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "title" ? 1 : -1 }));

  const SortIcon = ({ col }: { col: "title" | "createdAt" }) =>
    sort.key !== col ? <ArrowUpDown size={11} className="opacity-40" /> : sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;

  // 삭제는 상세페이지(/seller/popups/:id)로 이동 — 7/24 멘토 피드백 (표에서 실수 삭제 방지)
  const rows = useMemo(() => {
    const filtered = popups.filter(
      (p) =>
        (filter === "전체" || p.status === filter) &&
        (catFilter === null || (p.keywordNames ?? []).includes(catFilter)) &&
        (q === "" || p.title.includes(q) || p.companyName.includes(q)),
    );
    // 가나다순은 localeCompare(한글 정렬), 최신순은 ISO 문자열 비교
    return [...filtered].sort((a, b) =>
      sort.key === "title"
        ? a.title.localeCompare(b.title, "ko") * sort.dir
        : (a.createdAt ?? "").localeCompare(b.createdAt ?? "") * sort.dir,
    );
  }, [popups, filter, catFilter, q, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">팝업 조회/수정</h1>
          <p className="text-xs text-muted-foreground mt-0.5">등록한 팝업의 게시 상태를 확인하고 수정합니다.</p>
        </div>
        <Link to="/seller/popups/new" className="text-xs px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90">+ 새 팝업 등록</Link>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-xs text-amber-700">
          로그인하지 않아 내 팝업을 구분할 수 없습니다. <Link to="/login" state={{ from: "/seller/popups" }} className="underline underline-offset-2">로그인하기</Link>
        </div>
      )}

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
            placeholder="팝업명·브랜드 검색"
            className="pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm w-52 bg-card focus:outline-none focus:border-accent"
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
            <span className="text-[11px] text-muted-foreground ml-1">
              카테고리는 팝업 등록·수정 시 선택한 표준 카테고리 기준입니다.
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>
      )}

      {/* 목록 테이블 */}
      <div className="bg-card border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              {/* 7/29 — 팝업명·등록일 헤더 클릭으로 정렬 (가나다·최신순) */}
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("title")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  팝업명 <SortIcon col="title" />
                </button>
              </th>
              <th className="text-left font-medium px-4 py-2.5">운영 기간</th>
              {/* 7/29 — 공간 컬럼을 주소(location)·지역(region)으로 분리 */}
              <th className="text-left font-medium px-4 py-2.5">주소</th>
              <th className="text-left font-medium px-4 py-2.5">지역</th>
              <th className="text-left font-medium px-4 py-2.5">상태</th>
              <th className="text-left font-medium px-4 py-2.5">상태 확정일</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  등록일 <SortIcon col="createdAt" />
                </button>
              </th>
              <th className="text-center font-medium px-4 py-2.5">문의</th>
              <th className="text-center font-medium px-4 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </td>
              </tr>
            )}
            {!loading && rows.map((p) => {
              const meta = adminMeta[String(p.id)] ?? {};
              const suspended = isSuspended(p.status, p.rejectReason);
              const adminEditOpen = openAdminEditId === p.id;
              const answeredInqs = inquiries.filter((i) => i.status === "ANSWERED" && i.title.includes(`[${p.title}]`));
              const inqOpen = openInqPopupId === p.id;
              return (
                <Fragment key={p.id}>
                  <tr className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      {/* 제목 클릭 → 상세페이지 (7/24 멘토 피드백) */}
                      <Link to={`/seller/popups/${p.id}`} className="font-medium hover:text-accent hover:underline underline-offset-2 transition-colors">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}</td>
                    <td className="px-4 py-3 text-xs">{p.location ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">{p.regionName ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {suspended ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-white border-slate-800">게시중지</span>
                        ) : (
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                        )}
                        {/* 관리자가 상세를 수정한 경우: 배지 옆 버튼 → 아래로 확장해 수정사항·사유 확인 */}
                        {meta.editNote && (
                          <button
                            onClick={() => setOpenAdminEditId(adminEditOpen ? null : p.id)}
                            className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                              adminEditOpen ? "bg-accent text-accent-foreground border-accent" : "border-accent/40 text-accent hover:bg-accent/5"
                            }`}
                          >
                            <ShieldAlert size={10} /> 관리자 수정 {adminEditOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        )}
                        {/* 이 팝업 관련 문의에 관리자 답변이 달린 경우: 버튼 → 아래로 확장해 답변 확인 */}
                        {answeredInqs.length > 0 && (
                          <button
                            onClick={() => setOpenInqPopupId(inqOpen ? null : p.id)}
                            className={`inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                              inqOpen ? "bg-emerald-600 text-white border-emerald-600" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            <CheckCircle2 size={10} /> 문의답변완료 {inqOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          </button>
                        )}
                      </div>
                      {p.status === "REJECTED" && !suspended}
                    </td>
                    {/* 상태 확정일: 7/23부터 서버 기록(statusChangedAt) 사용 — 이전 로컬 기록(meta.statusDate)은 폴백 */}
                    <td className="px-4 py-3 text-xs">{fmtDate(p.statusChangedAt) !== "-" ? fmtDate(p.statusChangedAt) : meta.statusDate ?? "-"}</td>
                    <td className="px-4 py-3 text-xs">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Link
                          to={`/seller/inquiries?popup=${encodeURIComponent(p.title)}`}
                          title="이 팝업에 대해 관리자에게 문의"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-border text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                        >
                          <MessageSquare size={11} /> 문의
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* 삭제 버튼은 상세페이지로 이동 — 표에는 편집만 남김 */}
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Link to={`/seller/popups/new?id=${p.id}`} title="수정" className="hover:text-foreground"><Pencil size={14} /></Link>
                      </div>
                    </td>
                  </tr>

                  {/* 이 팝업 관련 답변 완료 문의 확장 행 */}
                  {inqOpen && answeredInqs.length > 0 && (
                    <tr className="bg-secondary/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="max-w-2xl flex flex-col gap-3">
                          {answeredInqs.map((iq) => (
                            <div key={iq.id} className="bg-card border border-emerald-200 rounded-sm p-4">
                              <div className="text-[13px] font-semibold mb-1">{iq.title}</div>
                              <div className="text-[12px] text-muted-foreground whitespace-pre-wrap mb-2.5">{iq.content}</div>
                              <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-1">
                                  <CheckCircle2 size={12} /> 관리자 답변 · {iq.answeredAt ? iq.answeredAt.slice(0, 16).replace("T", " ") : "-"}
                                </div>
                                <p className="text-[13px] text-emerald-900 whitespace-pre-wrap">{iq.answerContent}</p>
                              </div>
                            </div>
                          ))}
                          <Link to="/seller/inquiries" className="text-[11px] text-accent underline underline-offset-2 self-end">
                            문의하기 페이지에서 전체 보기 →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* 관리자 수정사항·사유 확장 행 */}
                  {adminEditOpen && meta.editNote && (
                    <tr className="bg-secondary/30">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="max-w-2xl bg-card border border-accent/30 rounded-sm p-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-2">
                            <ShieldAlert size={12} /> 관리자 수정사항 및 사유
                            {meta.editDate && <span className="font-normal text-muted-foreground">· {meta.editDate}</span>}
                          </div>
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{meta.editNote}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-muted-foreground">조건에 맞는 팝업이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
