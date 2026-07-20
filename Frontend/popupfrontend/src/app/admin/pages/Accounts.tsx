import { Info, ShieldCheck } from "lucide-react";

// 실제 DB(admin 테이블) 계정 목록.
// 관리자 목록 조회 API가 아직 없어 DB 기준으로 수동 반영 — 백엔드 구성 후 연동 필요.
// 계정 추가/변경은 회원가입 없이 운영팀이 DB에 직접 등록한다 (비밀번호는 BCrypt 해시).
const DB_ACCOUNTS = [
  { id: 1, email: "admin@popupon.kr", name: "플랫폼운영팀", createdAt: "2026-07-20" },
  { id: 2, email: "leejk@gmail.com", name: "이정기", createdAt: "2026-07-20" },
];

export default function Accounts() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">계정·역할(RBAC) 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          관리자 계정은 별도 회원가입 없이 운영팀이 DB에 직접 발급하며, JWT 인증으로 관리됩니다.
        </p>
      </div>

      {/* 운영 방침 안내 */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          현재 admin 테이블의 모든 계정은 <strong>마스터(전권)</strong>입니다. 역할 구분(슈퍼관리자/운영관리자 등)은
          백엔드에 role 컬럼·권한 검사 로직 추가 후 지원 예정이며, 아래 목록은 DB 기준 수동 반영입니다
          (관리자 목록 조회 API 백엔드 구성 후 연동 필요).
        </div>
      </div>

      {/* 계정 테이블 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
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
            {DB_ACCOUNTS.map((a) => (
              <tr key={a.id} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>{a.id}</td>
                <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{a.email}</td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                    <ShieldCheck size={10} /> 마스터 (전권)
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        계정 발급 절차: DB의 admin 테이블에 이메일·BCrypt 해시 비밀번호·이름을 직접 INSERT → 즉시 로그인 가능.
      </p>
    </div>
  );
}
