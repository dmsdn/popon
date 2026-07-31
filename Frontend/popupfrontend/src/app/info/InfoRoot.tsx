import { Outlet, NavLink, useNavigate, ScrollRestoration } from "react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, User, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

// 7/31 — 하드코딩된 localhost 주소를 lib/siteUrls.ts로 옮겼다.
// 배포하면 이 링크들이 사용자 자기 PC를 가리켜 「서비스페이지」·푸터가 전부 죽었다.
import { CONSUMER_URL as EXTERNAL_SERVICE_URL, ADMIN_CONSOLE_URL } from "../lib/siteUrls";

// 안내 페이지(/, /manage, /login, /signup) 전용 다크·라이트 전환 (7/30).
// theme.css의 .theme-light가 토큰을 다시 선언하므로 래퍼에 클래스만 붙이면 전체가 뒤집힌다.
// 주최자센터·관리자 콘솔은 이 토글의 영향을 받지 않는다 (그쪽은 내용 영역이 항상 라이트).
const THEME_KEY = "popupon_info_theme";

export default function Root() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 첫 렌더에서 바로 저장된 값을 읽는다 — 다크로 그렸다가 라이트로 튀는 깜빡임 방지
  const [light, setLight] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "light";
    } catch {
      return false; // localStorage가 막힌 환경(사파리 사생활 보호 등)에서는 기본 다크
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, light ? "light" : "dark");
    } catch {
      /* 저장 실패는 무시 — 이번 세션 동안만 적용된다 */
    }
    // 클래스는 <html>에 붙인다. body의 bg-background가 @layer base에 있어서
    // 래퍼 div에만 걸면 body가 다크로 남아 스크롤 여백에 검은 띠가 보인다.
    // InfoRoot가 언마운트되면(주최자센터로 이동) 정리 — 그쪽 다크 셸을 건드리지 않도록.
    const root = document.documentElement;
    root.classList.toggle("theme-light", light);
    return () => root.classList.remove("theme-light");
  }, [light]);

  // 주최자 등록은 회원가입 3단계 플로우에 통합됨 → 미로그인 시 회원가입으로 이동
  const handleOrganizerBtn = () => {
    setMenuOpen(false);
    if (user) {
      navigate("/seller");
    } else {
      navigate("/signup"); // 7/30 — 회원가입이 /signup으로 URL 분리됨
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors duration-200 ${
      isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div
      className={`${light ? "theme-light" : ""} min-h-screen bg-background text-foreground`}
      style={{ fontFamily: "'NanumSquareRound', sans-serif" }}
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <Logo height={22} />
            <span className="sr-only">
              팝온[POP-ON]
            </span>
          </NavLink>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLinkClass}>서비스 소개</NavLink>
            {/* 7/30 — 두 안내 페이지를 /manage 하나로 병합 (팝업등록 → 예약·웨이팅 순서) */}
            <NavLink to="/manage" className={navLinkClass}>팝업 통합 관리</NavLink>
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
            {/* 다크·라이트 전환 (7/30) — 안내 페이지에만 적용. 아이콘은 '전환하면 이렇게 된다'를 보여준다 */}
            <button
              onClick={() => setLight((v) => !v)}
              aria-label={light ? "다크 모드로 전환" : "밝은 모드로 전환"}
              aria-pressed={light}
              title={light ? "다크 모드로 전환" : "밝은 모드로 전환"}
              className="w-9 h-9 rounded-sm border border-border text-muted-foreground hover:text-accent hover:border-accent transition-colors flex items-center justify-center"
            >
              {light ? <Moon size={15} /> : <Sun size={15} />}
            </button>
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
                  className="text-sm px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 transition-colors duration-200"
                >
                  주최자센터
                </button>
              </div>
            ) : (
              <>
                <button
                  /* 7/30 URL 분리 — 로그인은 /login, 회원가입은 /signup. 탭 state 불필요해짐 */
                  onClick={() => navigate("/login")}
                  className="text-sm px-4 py-2 rounded-sm border border-foreground hover:bg-foreground hover:text-primary-foreground transition-colors duration-200"
                >
                  로그인
                </button>
                <button
                  onClick={handleOrganizerBtn}
                  className="text-sm px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 transition-colors duration-200"
                >
                  주최자 회원가입
                </button>
              </>
            )}
          </div>

          {/* Mobile: 테마 전환 + 햄버거 */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setLight((v) => !v)}
              aria-label={light ? "다크 모드로 전환" : "밝은 모드로 전환"}
              aria-pressed={light}
              className="w-9 h-9 text-muted-foreground hover:text-accent transition-colors flex items-center justify-center"
            >
              {light ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-6 py-5 flex flex-col gap-4">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>서비스 소개</NavLink>
            <NavLink to="/manage" className={navLinkClass} onClick={() => setMenuOpen(false)}>팝업 통합 관리</NavLink>
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
              <Logo height={20} />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              팝업스토어 주최자와 공간을 연결하는<br />대한민국 No.1 팝업 중개 플랫폼
            </p>
          </div>
          <div className="md:text-center">
            <div className="text-xs font-medium text-muted-foreground mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>고객센터</div>
            <div className="text-sm font-semibold">1588-0000</div>
            <div className="text-xs text-muted-foreground mt-1">평일 09:00 — 18:00</div>
          </div>
          <div className="md:text-right">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <div>㈜팝온[POP-ON] | 대표 하이미디어아카데미</div>
              <div className="mt-1">서울특별시 강남구 테헤란로 5길 20</div>
              <div className="mt-1">사업자등록번호 123-45-67890</div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground">© 애지중지. All rights reserved.</div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">이용약관</a>
            <a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a>
            <a href={EXTERNAL_SERVICE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">소비자 서비스</a>
            <NavLink to="/seller" className="hover:text-foreground transition-colors">주최자센터</NavLink>
            <a href={ADMIN_CONSOLE_URL} className="hover:text-foreground transition-colors">관리자</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
