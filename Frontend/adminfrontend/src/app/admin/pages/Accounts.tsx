import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { getAdminAccounts, AdminAccount } from "../../lib/api";

// 관리자 계정 목록 조회 화면 (GET /api/admin/admins, 조회 전용).
// 계정 추가/변경은 회원가입 없이 운영팀이 DB에 직접 등록한다 (비밀번호는 BCrypt 해시).

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

export default function Accounts() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getAdminAccounts()
      .then((list) => alive && setAccounts(list))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "계정 목록을 불러오지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-lg font-semibold">계정·역할(RBAC) 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          관리자 계정은 별도 회원가입 없이 운영팀이 DB에 직접 발급하며, JWT 인증으로 관리됩니다.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-xs text-red-600">{error}</div>}

      {/* 관리자 계정 목록 테이블 */}
      <div className="bg-card border border-border rounded-sm overflow-x-auto">
        <div className="px-4 py-3 border-b border-border text-sm font-semibold">
          관리자 계정{!loading && accounts.length > 0 ? ` ${accounts.length}개` : ""}
        </div>
        <table className="w-full text-[13px] min-w-[560px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">계정 (이메일)</th>
              <th className="text-left font-medium px-4 py-2.5">이름</th>
              <th className="text-left font-medium px-4 py-2.5">역할</th>
              <th className="text-left font-medium px-4 py-2.5">발급일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  <Loader2 size={14} className="inline animate-spin mr-1.5" /> 불러오는 중…
                </td>
              </tr>
            )}
            {!loading && accounts.map((a) => (
              <tr key={a.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{a.id}</td>
                <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{a.email}</td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                    <ShieldCheck size={10} /> 마스터 (전권)
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(a.createdAt)}</td>
              </tr>
            ))}
            {!loading && !error && accounts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-muted-foreground">등록된 관리자 계정이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        계정 발급 절차: DB의 admin 테이블에 이메일·BCrypt 해시 비밀번호·이름을 직접 INSERT → 즉시 로그인 가능.
      </p>
    </div>
  );
}