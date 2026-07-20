import { useEffect } from "react";
import { Outlet, NavLink, Link, useNavigate, useLocation, ScrollRestoration } from "react-router";
import {
  LayoutDashboard, Store, PlusSquare, CalendarCheck, Users, Package,
  FileText, BarChart3, Megaphone, Bell, ChevronDown, ExternalLink, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const MENU = [
  {
    group: "홈",
    items: [{ to: "/seller", end: true, icon: LayoutDashboard, label: "대시보드" }],
  },
  {
    group: "팝업 관리",
    items: [
      { to: "/seller/popups", icon: Store, label: "팝업 조회/수정" },
      { to: "/seller/popups/new", icon: PlusSquare, label: "팝업 등록" },
    ],
  },
  {
    group: "예약·입장 운영",
    items: [
      { to: "/seller/reservations", icon: CalendarCheck, label: "예약 슬롯·명단" },
      { to: "/seller/waiting", icon: Users, label: "대기열·인원 관제" },
    ],
  },
  {
    group: "굿즈·재고",
    items: [{ to: "/seller/products", icon: Package, label: "상품/재고 관리" }],
  },
  {
    group: "견적·계약·정산",
    items: [{ to: "/seller/quotes", icon: FileText, label: "견적·진행 단계" }],
  },
  {
    group: "데이터",
    items: [{ to: "/seller/performance", icon: BarChart3, label: "성과 대시보드" }],
  },
  {
    group: "마케팅",
    items: [{ to: "/seller/notices", icon: Megaphone, label: "긴급공지 발송" }],
  },
];

export default function SellerRoot() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 주최자센터는 로그인(사업자 토큰) 필수
  useEffect(() => {
    if (!user) navigate("/login", { replace: true, state: { from: location.pathname } });
  }, [user, navigate, location.pathname]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-foreground flex flex-col" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ── 상단 바 ── */}
      <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/seller" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
            </div>
            <span className="font-semibold text-sm tracking-tight">팝업온 <span className="text-accent">주최자센터</span></span>
          </Link>
          <span className="hidden md:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">파트너 전용</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            서비스 소개 홈 <ExternalLink size={12} />
          </Link>
          <button className="relative text-muted-foreground hover:text-foreground">
            <Bell size={17} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-white text-[9px] flex items-center justify-center">3</span>
          </button>
          <div className="flex items-center gap-2 text-xs border-l border-border pl-4">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center font-semibold text-[10px]">
              {(user?.name ?? "게스트").slice(0, 1)}
            </div>
            <span className="hidden sm:inline">{user?.name ?? "게스트"} 님</span>
            <ChevronDown size={13} className="text-muted-foreground" />
          </div>
          {user && (
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut size={13} /> 로그아웃
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        {/* ── 좌측 사이드바 ── */}
        <aside className="hidden lg:flex w-56 shrink-0 bg-white border-r border-border flex-col py-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          {MENU.map(({ group, items }) => (
            <div key={group} className="mb-4">
              <div className="px-5 mb-1.5 text-[11px] font-medium text-muted-foreground tracking-wide">{group}</div>
              {items.map(({ to, icon: Icon, label, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={"end" in rest ? (rest as { end?: boolean }).end : to === "/seller/popups"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-5 py-2 text-[13px] border-l-2 transition-colors ${
                      isActive
                        ? "border-accent bg-accent/5 text-accent font-medium"
                        : "border-transparent text-foreground/80 hover:bg-secondary"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="mt-auto px-5 pt-4 border-t border-border">
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              파트너 지원센터<br />
              <span className="font-semibold text-foreground">1588-0000</span> (내선 2)
            </div>
          </div>
        </aside>

        {/* ── 콘텐츠 ── */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <ScrollRestoration />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
