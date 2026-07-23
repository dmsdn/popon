import { Search, Info } from "lucide-react";

// 소비자 회원 관리 — 요구사항: 회원 목록 조회, 이용 제재/정지, 탈퇴 처리
// 회원 목록 조회 API가 아직 없어 화면 골격만 구성 — 백엔드 구성 후 연동 필요.
export default function Members() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">소비자 회원 관리</h1>
        <p className="text-xs text-muted-foreground mt-0.5">회원 목록 조회, 이용 제재/정지, 탈퇴 처리를 담당합니다.</p>
      </div>

      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-sm px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 leading-relaxed">
          회원 목록 조회·제재·탈퇴 API가 아직 백엔드에 없습니다 — <strong>백엔드 구성 후 연동 필요</strong>.
          (DB에는 customer 테이블이 이미 존재: 이메일·닉네임·가입경로(provider)·가입일)
        </div>
      </div>

      {/* 검색 바 (연동 전 비활성) */}
      <div className="bg-white border border-border rounded-sm p-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            disabled
            placeholder="이메일·닉네임 검색 (연동 후 사용 가능)"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-sm bg-secondary/40 focus:outline-none"
          />
        </div>
      </div>

      {/* 회원 테이블 골격 */}
      <div className="bg-white border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-[13px] min-w-[720px]">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">ID</th>
              <th className="text-left font-medium px-4 py-2.5">이메일</th>
              <th className="text-left font-medium px-4 py-2.5">닉네임</th>
              <th className="text-left font-medium px-4 py-2.5">가입경로</th>
              <th className="text-left font-medium px-4 py-2.5">가입일</th>
              <th className="text-center font-medium px-4 py-2.5">상태</th>
              <th className="text-center font-medium px-4 py-2.5">관리 (제재/탈퇴)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-xs text-muted-foreground">
                회원 목록 API 백엔드 구성 후 연동 필요
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
