import { Outlet, NavLink, Link, useNavigate } from "react-router";
import { Home, Compass, CalendarCheck, User, Bell } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { NOTIFICATIONS } from "./data";

const NAV = [
  { to: "/", end: true, icon: Home, label: "홈" },
  { to: "/explore", icon: Compass, label: "탐색" },
  { to: "/reservations", icon: CalendarCheck, label: "예약·웨이팅" },
  { to: "/my", icon: User, label: "마이" },
];

export default function Root() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen bg-[#f4f5f7]" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* 모바일 앱 프레임 */}
      <div className="max-w-md mx-auto min-h-screen bg-background text-foreground flex flex-col relative shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        {/* ── 상단 바 ── */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
                <span className="text-white text-xs font-bold leading-none" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
              </div>
              <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>팝업온</span>
            </Link>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/notifications")} className="relative text-muted-foreground hover:text-foreground">
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-white text-[9px] flex items-center justify-center">{unread}</span>
                )}
              </button>
              {user ? (
                <button onClick={() => navigate("/my")} className="w-7 h-7 rounded-full bg-accent/10 text-accent text-xs font-semibold flex items-center justify-center">
                  {user.nickname.slice(0, 1)}
                </button>
              ) : (
                <button onClick={() => navigate("/login")} className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-medium">
                  로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ── 페이지 ── */}
        <main className="flex-1 pb-20">
          <Outlet />
        </main>

        {/* ── 하단 탭 바 ── */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t border-border grid grid-cols-4 z-40">
          {NAV.map(({ to, icon: Icon, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest ? (rest as { end?: boolean }).end : false}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${
                  isActive ? "text-accent font-semibold" : "text-muted-foreground"
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
