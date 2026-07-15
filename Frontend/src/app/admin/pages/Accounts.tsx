import { useState } from "react";
import { Plus, ShieldCheck, KeyRound } from "lucide-react";

type Role = "슈퍼관리자" | "운영관리자" | "브랜드담당자" | "현장스태프";

const ROLE_DESC: Record<Role, { color: string; scope: string }> = {
  슈퍼관리자: { color: "bg-red-50 text-red-500 border-red-200", scope: "전체 권한 · 계정/권한 관리 포함" },
  운영관리자: { color: "bg-blue-50 text-blue-600 border-blue-200", scope: "심사·CS·콘텐츠 관리 (권한 변경 불가)" },
  브랜드담당자: { color: "bg-emerald-50 text-emerald-600 border-emerald-200", scope: "자사 팝업 데이터만 접근" },
  현장스태프: { color: "bg-amber-50 text-amber-600 border-amber-200", scope: "QR 스캔·대기열 관제 화면만 접근" },
};

const ACCOUNTS = [
  { email: "admin@popupon.kr", name: "박민준", role: "슈퍼관리자" as Role, lastLogin: "07-15 09:12", active: true },
  { email: "ops1@popupon.kr", name: "김지원", role: "운영관리자" as Role, lastLogin: "07-15 08:47", active: true },
  { email: "ops2@popupon.kr", name: "이현우", role: "운영관리자" as Role, lastLogin: "07-14 18:20", active: true },
  { email: "manager@moonerfriends.com", name: "최수아", role: "브랜드담당자" as Role, lastLogin: "07-15 10:02", active: true },
  { email: "staff01@moonerfriends.com", name: "정태오", role: "현장스태프" as Role, lastLogin: "07-15 09:55", active: true },
  { email: "manager@recordlab.kr", name: "한예림", role: "브랜드담당자" as Role, lastLogin: "06-30 12:11", active: false },
];

export default function Accounts() {
  const [rows, setRows] = useState(ACCOUNTS);
  const toggle = (email: string) =>
    setRows((prev) => prev.map((a) => (a.email === email ? { ...a, active: !a.active } : a)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">계정·역할(RBAC) 관리</h1>
          <p className="text-xs text-muted-foreground mt-0.5">역할별 접근범위를 부여하고, JWT 인증·접속 로그로 관리됩니다.</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90">
          <Plus size={13} /> 계정 발급
        </button>
      </div>

      {/* 역할 안내 */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {(Object.keys(ROLE_DESC) as Role[]).map((role) => (
          <div key={role} className="bg-white border border-border rounded-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={14} className="text-muted-foreground" />
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ROLE_DESC[role].color}`}>{role}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{ROLE_DESC[role].scope}</p>
          </div>
        ))}
      </div>

      {/* 계정 테이블 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">계정 (이메일)</th>
              <th className="text-left font-medium px-4 py-2.5">이름</th>
              <th className="text-left font-medium px-4 py-2.5">역할</th>
              <th className="text-left font-medium px-4 py-2.5">최근 접속</th>
              <th className="text-center font-medium px-4 py-2.5">상태</th>
              <th className="text-center font-medium px-4 py-2.5">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => (
              <tr key={a.email} className="hover:bg-secondary/40">
                <td className="px-4 py-3 text-xs" style={{ fontFamily: "'DM Mono', monospace" }}>{a.email}</td>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={a.role}
                    className="text-xs border border-border rounded-sm px-2 py-1 bg-white focus:outline-none focus:border-accent"
                    disabled={a.role === "슈퍼관리자"}
                  >
                    {(Object.keys(ROLE_DESC) as Role[]).map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.lastLogin}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${a.active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                    {a.active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <button className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent">
                      <KeyRound size={10} /> 비밀번호 초기화
                    </button>
                    <button
                      onClick={() => toggle(a.email)}
                      disabled={a.role === "슈퍼관리자"}
                      className="text-[11px] px-2 py-1 rounded-sm border border-border hover:bg-secondary disabled:opacity-40"
                    >
                      {a.active ? "비활성화" : "활성화"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
