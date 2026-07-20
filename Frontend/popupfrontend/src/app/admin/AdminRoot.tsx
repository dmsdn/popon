import { Outlet, NavLink, Link } from "react-router";
import {
  LayoutDashboard, ShieldCheck, KeyRound, Database,
  LineChart, Newspaper, Headphones, Bell, ExternalLink, Users, LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MENU = [
  { group: "모니터링", items: [
    { to: "/admin", end: true, icon: LayoutDashboard, label: "대시보드 홈" },
    { to: "/admin/stats", icon: LineChart, label: "플랫폼 종합 성과" },
  ]},
  { group: "심사·승인", items: [
    { to: "/admin/review", icon: ShieldCheck, label: "팝업 심사·게시 승인" },
  ]},
  { group: "운영 관리", items: [
    { to: "/admin/accounts", icon: KeyRound, label: "계정·권한(RBAC)" },
    { to: "/admin/members", icon: Users, label: "소비자 회원 관리" },
    { to: "/admin/masters", icon: Database, label: "공간·카테고리 마스터" },
    { to: "/admin/content", icon: Newspaper, label: "배너·콘텐츠 관리" },
    { to: "/admin/cs", icon: Headphones, label: "CS·리뷰 모더레이션" },
  ]},
];

// 오늘 날짜 → "2026-07-20 (월)" 형식
function todayLabel() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const day = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  return `${y}-${m}-${d} (${day})`;
}

export default function AdminRoot() {
  const { user, logout } = useAuth();
  const admin = user?.role === "admin" ? user : null;
  const accountName = admin ? admin.email.split("@")[0] : null;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-foreground flex" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ── 좌측 다크 사이드바 ── */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-[#191d24] text-white/80 flex-col sticky top-0 h-screen overflow-y-auto">
        <Link to="/admin" className="flex items-center gap-2 px-5 h-14 border-b border-white/10">
          <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">팝업온 Admin</div>
            <div className="text-[10px] text-white/40">Platform Operations</div>
          </div>
        </Link>
        <div className="py-4 flex-1">
          {MENU.map(({ group, items }) => (
            <div key={group} className="mb-5">
              <div className="px-5 mb-1.5 text-[10px] font-medium tracking-widest uppercase text-white/35" style={{ fontFamily: "'DM Mono', monospace" }}>
                {group}
              </div>
              {items.map(({ to, icon: Icon, label, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={"end" in rest ? (rest as { end?: boolean }).end : false}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-5 py-2 text-[13px] border-l-2 transition-colors ${
                      isActive ? "border-accent bg-white/5 text-white font-medium" : "border-transparent hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-white/10 text-[11px] text-white/40 leading-relaxed">
          슈퍼관리자 콘솔 v1.0<br />접속 로그가 기록됩니다.
        </div>
      </aside>

      {/* ── 우측 영역 ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="text-sm font-medium lg:hidden">팝업온 Admin</div>
          <div className="hidden lg:block text-xs text-muted-foreground">{todayLabel()} · 정상 운영 중</div>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              서비스 홈 <ExternalLink size={12} />
            </Link>
            <button className="relative text-muted-foreground hover:text-foreground">
              <Bell size={17} />
            </button>
            {admin ? (
              <div className="flex items-center gap-2 text-xs border-l border-border pl-4">
                <div className="w-6 h-6 rounded-full bg-[#191d24] text-white flex items-center justify-center font-semibold text-[10px] uppercase">
                  {accountName!.slice(0, 1)}
                </div>
                <span className="hidden sm:inline">{accountName} · 슈퍼관리자</span>
                <button onClick={logout} className="text-muted-foreground underline underline-offset-2 hover:text-foreground">로그아웃</button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="flex items-center gap-1.5 text-xs border-l border-border pl-4 text-accent hover:underline underline-offset-2"
              >
                <LogIn size={13} /> 관리자 로그인
              </Link>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
