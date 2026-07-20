import { Outlet, NavLink, useNavigate, ScrollRestoration } from "react-router";
import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const EXTERNAL_SERVICE_URL = "http://localhost:5173"; // 소비자 프론트엔드(customerfrontend) 루트

export default function Root() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 주최자 등록은 회원가입 3단계 플로우에 통합됨 → 미로그인 시 회원가입으로 이동
  const handleOrganizerBtn = () => {
    setMenuOpen(false);
    if (user) {
      navigate("/seller");
    } else {
      navigate("/login", { state: { tab: "signup" } });
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors duration-200 ${
      isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-sm bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
            </div>
            <span className="text-base font-semibold tracking-tight" style={{ fontFamily: "'Noto Serif KR', serif" }}>
              팝업온
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLinkClass}>서비스 소개</NavLink>
            <NavLink to="/content-register" className={navLinkClass}>팝업콘텐츠 등록</NavLink>
            <NavLink to="/waiting-management" className={navLinkClass}>예약·웨이팅 통합관리</NavLink>
            <a
              href={EXTERNAL_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1"
            >
              서비스페이지
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-50">
                <path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={14} />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={() => { logout(); navigate("/"); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogOut size={14} />
                  로그아웃
                </button>
                <button
                  onClick={() => navigate("/seller")}
                  className="text-sm px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
                >
                  주최자센터
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm px-4 py-2 rounded-sm border border-foreground hover:bg-foreground hover:text-primary-foreground transition-colors duration-200"
                >
                  로그인
                </button>
                <button
                  onClick={handleOrganizerBtn}
                  className="text-sm px-4 py-2 rounded-sm bg-accent text-white hover:bg-accent/90 transition-colors duration-200"
                >
                  주최자 회원가입
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-5 flex flex-col gap-4">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>서비스 소개</NavLink>
            <NavLink to="/content-register" className={navLinkClass} onClick={() => setMenuOpen(false)}>팝업콘텐츠 등록</NavLink>
            <NavLink to="/waiting-management" className={navLinkClass} onClick={() => setMenuOpen(false)}>예약·웨이팅 통합관리</NavLink>
            <a
              href={EXTERNAL_SERVICE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => setMenuOpen(false)}
            >
              서비스페이지 ↗
            </a>
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              {user ? (
                <>
                  <div className="text-sm text-muted-foreground">{user.name} 님</div>
                  <button onClick={() => { logout(); navigate("/"); setMenuOpen(false); }} className="text-sm text-left text-muted-foreground">로그아웃</button>
                  <button onClick={() => { navigate("/seller"); setMenuOpen(false); }} className="text-sm text-left text-accent font-medium">주최자센터 →</button>
                </>
              ) : (
                <>
                  <button onClick={() => { navigate("/login"); setMenuOpen(false); }} className="text-sm text-left">로그인</button>
                  <button onClick={handleOrganizerBtn} className="text-sm text-left text-accent font-medium">주최자 회원가입 →</button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── PAGE CONTENT ────────────────────────────────────── */}
      {/* 라우트 이동 시 스크롤 맨 위로 (뒤로가기는 이전 위치 복원) */}
      <ScrollRestoration />
      <Outlet />

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-sm bg-accent flex items-center justify-center">
                <span className="text-white text-xs font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>PO</span>
              </div>
              <span className="font-semibold text-sm" style={{ fontFamily: "'Noto Serif KR', serif" }}>팝업온</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              팝업스토어 주최자와 공간을 연결하는<br />대한민국 No.1 팝업 중개 플랫폼
            </p>
          </div>
          <div className="md:text-center">
            <div className="text-xs font-medium text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>고객센터</div>
            <div className="text-sm font-semibold">1588-0000</div>
            <div className="text-xs text-muted-foreground mt-1">평일 09:00 — 18:00</div>
            <div className="text-xs text-accent mt-1">hello@popupon.kr</div>
          </div>
          <div className="md:text-right">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <div>㈜팝업온 | 대표 박민준</div>
              <div className="mt-1">서울시 성동구 성수이로 14길 14</div>
              <div className="mt-1">사업자등록번호 123-45-67890</div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">© 2025 팝업온. All rights reserved.</div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href={EXTERNAL_SERVICE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">소비자 서비스</a>
            <NavLink to="/seller" className="hover:text-foreground transition-colors">주최자센터</NavLink>
            <NavLink to="/admin" className="hover:text-foreground transition-colors">관리자</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
