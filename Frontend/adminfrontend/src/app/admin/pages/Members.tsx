import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, Ban, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getCustomerAccounts, suspendCustomer, resumeCustomer, CustomerAccount } from "../../lib/api";

// 소비자 회원 관리 — 7/29 실연동 (GET /api/admin/customers + 정지/해제 PATCH)
// 검색(이메일·닉네임) + 헤더 정렬(가나다·최신순)

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function Members() {
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: "nickname" | "createdAt"; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [actingId, setActingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getCustomerAccounts()
      .then((list) => alive && setCustomers(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "회원 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const toggleSort = (key: "nickname" | "createdAt") =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: key === "nickname" ? 1 : -1 }));

  const SortIcon = ({ col }: { col: "nickname" | "createdAt" }) =>
    sort.key !== col ? <ArrowUpDown size={11} className="opacity-40" /> : sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />;

  const rows = useMemo(() => {
    const query = q.trim();
    const filtered = customers.filter(
      (c) => query === "" || (c.email ?? "").includes(query) || (c.nickname ?? "").includes(query),
    );
    return [...filtered].sort((a, b) =>
      sort.key === "nickname"
        ? (a.nickname ?? "").localeCompare(b.nickname ?? "", "ko") * sort.dir
        : (a.createdAt ?? "").localeCompare(b.createdAt ?? "") * sort.dir,
    );
  }, [customers, q, sort]);

  // 정지/해제 — 서버 처리 후 로컬 상태 갱신
  const toggleSuspend = async (c: CustomerAccount) => {
    const suspending = !c.suspended;
    if (!window.confirm(suspending ? `「${c.nickname ?? c.email}」 회원을 정지할까요?` : `「${c.nickname ?? c.email}」 회원 정지를 해제할까요?`)) return;
    setActingId(c.id);
    try {
      if (suspending) await suspendCustomer(c.id);
      else await resumeCustomer(c.id);
      setCustomers((prev) => prev.map((x) => (x.id === c.id ? { ...x, suspended: suspending } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리에 실패했습니다.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">소비자 회원 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">회원 목록 조회와 이용 제재(정지/해제)를 담당합니다.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 검색 */}
      <div className="bg-white border border-border rounded-sm p-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이메일·닉네임 검색"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm bg-white focus:outline-none focus:border-accent"
          />
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">{rows.length}명</span>
      </div>

      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[760px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("nickname")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  닉네임 <SortIcon col="nickname" />
                </button>
              </th>
              <th className="text-left font-medium px-4 py-2.5">이메일</th>
              <th className="text-left font-medium px-4 py-2.5">가입경로</th>
              <th className="text-left font-medium px-4 py-2.5">상태</th>
              <th className="text-left font-medium px-4 py-2.5">
                <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                  가입일 <SortIcon col="createdAt" />
                </button>
              </th>
              <th className="text-center font-medium px-4 py-2.5">제재</th>
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
            {!loading && rows.map((c) => (
              <tr key={c.id} className={`hover:bg-secondary/40 ${c.withdrawn ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{c.id}</td>
                <td className="px-4 py-3 font-medium">{c.nickname ?? "-"}</td>
                <td className="px-4 py-3 text-xs">{c.email ?? "-"}</td>
                <td className="px-4 py-3 text-xs">{c.provider ?? "-"}</td>
                <td className="px-4 py-3">
                  {c.withdrawn ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-100 text-slate-400 border-slate-200">탈퇴</span>
                  ) : c.suspended ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">정지</span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200">정상</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{fmtDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  {!c.withdrawn && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggleSuspend(c)}
                        disabled={actingId === c.id}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border disabled:opacity-40 ${
                          c.suspended
                            ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            : "border-red-200 text-red-500 hover:bg-red-50"
                        }`}
                      >
                        {c.suspended ? <><RotateCcw size={11} /> 정지 해제</> : <><Ban size={11} /> 정지</>}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !error && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">조건에 맞는 회원이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
