import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getBusinessAccounts, getPopups, BusinessAccount, Popup } from "../../lib/api";

// 주최자(사업자) 회원 관리 — 7/29 실연동 (GET /api/admin/businesses)
// 계정 실데이터(이메일·사업자번호·연락처·가입일) + 팝업 등록 이력(GET /api/popups)에서 파생한 팝업 현황을 병합.
// 검색(회사명·이메일·사업자번호) + 헤더 정렬(가나다·최신순)도 7/29 추가.

type PopupStat = { total: number; published: number; pending: number; rejected: number };

function aggregate(popups: Popup[]): Record<number, PopupStat> {
  const map: Record<number, PopupStat> = {};
  for (const p of popups) {
    const row = (map[p.businessId] ??= { total: 0, published: 0, pending: 0, rejected: 0 });
    row.total += 1;
    if (p.status === "BEFOR" || p.status === "OPEN") row.published += 1;
    if (p.status === "PENDING") row.pending += 1;
    if (p.status === "REJECTED") row.rejected += 1;
  }
  return map;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function Businesses() {
  const [accounts, setAccounts] = useState<BusinessAccount[]>([]);
  const [stats, setStats] = useState<Record<number, PopupStat>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: "companyName" | "createdAt"; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });

  useEffect(() => {
    let alive = true;
    // 계정 목록이 본 데이터 — 팝업 현황은 부가 정보라 실패해도 표는 뜬다
    getBusinessAccounts()
      .then((list) => alive && setAccounts(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "주최자 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    getPopups()
      .then((all) => alive && setStats(aggregate(all)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const toggleSort = (key: "companyName" | "createdAt") =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "companyName" ? 1 : -1 }));

  const SortIcon = ({ col }: { col: "companyName" | "createdAt" }) =>
    sort.key !== col ? <ArrowUpDown size={11} className="opacity-40" /> : sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;

  const rows = useMemo(() => {
    const query = q.trim();
    const filtered = accounts.filter(
      (a) =>
        query === "" ||
        a.companyName.includes(query) ||
        a.email.includes(query) ||
        (a.businessNumber ?? "").includes(query),
    );
    return [...filtered].sort((a, b) =>
      sort.key === "companyName"
        ? a.companyName.localeCompare(b.companyName, "ko") * sort.dir
        : (a.createdAt ?? "").localeCompare(b.createdAt ?? "") * sort.dir,
    );
  }, [accounts, q, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">주최자 회원 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          가입한 주최자(사업자) 계정과 팝업 등록 현황을 확인합니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 검색 (7/29) */}
      <div className="bg-white border border-border rounded-sm p-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="회사명·이메일·사업자번호 검색"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
          />
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">{rows.length}개 계정</span>
      </div>

      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[860px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("companyName")} className="inline-flex items-center gap-1 hover:text-foreground">
                  회사명 <SortIcon col="companyName" />
                </button>
              </th>
              <th className="text-left font-medium px-4 py-2.5">이메일</th>
              <th className="text-left font-medium px-4 py-2.5">사업자번호</th>
              <th className="text-left font-medium px-4 py-2.5">연락처</th>
              <th className="text-right font-medium px-4 py-2.5">팝업 (게시/심사/반려)</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 hover:text-foreground">
                  가입일 <SortIcon col="createdAt" />
                </button>
              </th>
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
            {!loading && rows.map((a) => {
              const st = stats[a.id];
              return (
                <tr key={a.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{a.id}</td>
                  <td className="px-4 py-3 font-medium">{a.companyName}</td>
                  <td className="px-4 py-3 text-xs">{a.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{a.businessNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">{a.phone ?? "-"}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    {st ? (
                      <>
                        <span className="font-semibold">{st.total}</span>
                        <span className="text-muted-foreground"> ({st.published}/{st.pending}/{st.rejected})</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">{fmtDate(a.createdAt)}</td>
                </tr>
              );
            })}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">조건에 맞는 주최자가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
