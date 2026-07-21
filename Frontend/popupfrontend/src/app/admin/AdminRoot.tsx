import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, Navigate, useLocation, ScrollRestoration } from "react-router";
import {
  LayoutDashboard, KeyRound, Database,
  LineChart, Newspaper, Headphones, Bell, ExternalLink, Users, LogIn, Store, Building2, X, Clock3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getToken, getPopups, getAdminCsList, getAdminInquiries, getAdminReports, Popup } from "../lib/api";
import { loadSeen, saveSeen, unseenCount } from "../lib/navBadges";

const MENU = [
  { group: "모니터링", items: [
    { to: "/admin", end: true, icon: LayoutDashboard, label: "대시보드 홈" },
    { to: "/admin/stats", icon: LineChart, label: "플랫폼 종합 성과" },
  ]},
  { group: "운영 관리", items: [
    { to: "/admin/popups", icon: Store, label: "팝업 관리" },
    { to: "/admin/cs", icon: Headphones, label: "문의 및 신고관리" },
    { to: "/admin/masters", icon: Database, label: "공간·카테고리 마스터" },
    { to: "/admin/content", icon: Newspaper, label: "배너·콘텐츠 관리" },
  ]},
  { group: "계정 관리", items: [
    { to: "/admin/accounts", icon: KeyRound, label: "관리자 계정 리스트" },
    { to: "/admin/businesses", icon: Building2, label: "주최자 회원 관리" },
    { to: "/admin/members", icon: Users, label: "소비자 회원 관리" },
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

// JWT payload에서 발급(iat)·만료(exp) 시각(초 단위 epoch) 추출 — 로그인 시간·세션 카운트다운용
function decodeJwtTimes(token: string): { iat?: number; exp?: number } | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const fmtHM = (epochSec: number) => {
  const d = new Date(epochSec * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtRemaining = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// 확인한 알림(배지 해제용) / 클릭해서 목록에서 지운 알림 저장 키
const SEEN_KEY = "adminSeenPopupNotifs";
const DISMISSED_KEY = "adminDismissedPopupNotifs";
const loadIds = (key: string): number[] => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
};

export default function AdminRoot() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const admin = user?.role === "admin" ? user : null;
  const accountName = admin ? admin.email.split("@")[0] : null;

  // ── 세션 타이머 (로그인 시각 = JWT iat, 만료 = JWT exp) ──
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const token = getToken();
  const times = admin && token ? decodeJwtTimes(token) : null;
  const remaining = times?.exp ? Math.max(0, times.exp - nowSec) : null;

  useEffect(() => {
    if (!admin) return;
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, [admin]);

  // 세션 만료 시 자동 로그아웃 (금융권 웹과 동일)
  useEffect(() => {
    if (admin && remaining === 0) {
      alert("로그인 유지 시간이 만료되어 로그아웃됩니다.");
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0, admin]);

  // ── 알림: 새로 등록된(심사 대기) 팝업 ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [pendingPopups, setPendingPopups] = useState<Popup[]>([]);
  const [seenIds, setSeenIds] = useState<number[]>(() => loadIds(SEEN_KEY));
  const [dismissedIds, setDismissedIds] = useState<number[]>(() => loadIds(DISMISSED_KEY));
  // 패널 목록: 클릭해서 지운 항목은 제외 / 배지: 아직 확인 안 한 항목 수
  const visiblePopups = pendingPopups.filter((p) => !dismissedIds.includes(p.id));
  const unseen = visiblePopups.filter((p) => !seenIds.includes(p.id));

  // 항목 클릭 → 목록에서 제거 (localStorage에 기억, 새로고침해도 유지)
  const dismissNotif = (id: number) => {
    const ids = [...new Set([...dismissedIds, id])];
    setDismissedIds(ids);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  };

  // 사이드바 뱃지용 미처리 항목 키 (CS·문의·신고) — 알림과 같은 주기로 갱신
  const [csKeys, setCsKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!admin) return;
    const fetchPending = () => {
      getPopups()
        .then((all) =>
          setPendingPopups(
            all.filter((p) => p.status === "PENDING").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          ),
        )
        .catch(() => {});
      Promise.all([getAdminCsList("PENDING"), getAdminInquiries("PENDING"), getAdminReports("PENDING")])
        .then(([cs, inq, rep]) =>
          setCsKeys([
            ...cs.map((c) => `cs:${c.id}`),
            ...inq.map((i) => `inq:${i.id}`),
            ...rep.map((r) => `rep:${r.id}`),
          ]),
        )
        .catch(() => {});
    };
    fetchPending();
    const t = setInterval(fetchPending, 60_000); // 1분마다 새 등록 확인
    return () => clearInterval(t);
  }, [admin]);

  // 메뉴 경로별 '아직 확인 안 한' 항목 — 해당 라우트로 이동하면 즉시 뱃지 해제
  const navKeys: Record<string, string[]> = {
    "/admin/popups": pendingPopups.map((p) => `popup:${p.id}`),
    "/admin/cs": csKeys,
  };
  const [seenNav, setSeenNav] = useState<Record<string, string[]>>(() => ({
    "/admin/popups": loadSeen("/admin/popups"),
    "/admin/cs": loadSeen("/admin/cs"),
  }));
  const badgeCounts: Record<string, number> = Object.fromEntries(
    Object.entries(navKeys).map(([route, keys]) => [route, unseenCount(keys, seenNav[route] ?? [])]),
  );

  useEffect(() => {
    const route = Object.keys(navKeys).find(
      (r) => location.pathname === r || location.pathname.startsWith(r + "/"),
    );
    if (!route) return;
    const keys = navKeys[route];
    if (unseenCount(keys, seenNav[route] ?? []) === 0) return;
    saveSeen(route, keys);
    setSeenNav((prev) => ({ ...prev, [route]: keys }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, pendingPopups, csKeys]);

  // 패널을 열면 현재 목록을 '확인함'으로 기록 → 배지 해제
  const openNotif = () => {
    setNotifOpen(true);
    const ids = [...new Set([...seenIds, ...visiblePopups.map((p) => p.id)])];
    setSeenIds(ids);
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  };

  // 미로그인 시 어떤 관리자 라우트로 접근해도 로그인 페이지로 이동
  if (!admin && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

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
                  {(badgeCounts[to] ?? 0) > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {badgeCounts[to] > 99 ? "99+" : badgeCounts[to]}
                    </span>
                  )}
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
          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground">
            <span>{todayLabel()}</span>
            {admin && times?.iat && (
              <>
                <span className="text-border">|</span>
                <span>로그인 {fmtHM(times.iat)}</span>
                {remaining !== null && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1 text-foreground/70">
                    <Clock3 size={11} />
                    자동 로그아웃까지{" "}
                    <span
                      className={remaining < 300 ? "text-red-500 font-semibold" : "font-medium"}
                      style={{ fontFamily: "'DM Mono', monospace" }}
                    >
                      {fmtRemaining(remaining)}
                    </span>
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              서비스 홈 <ExternalLink size={12} />
            </Link>
            <button
              onClick={() => (notifOpen ? setNotifOpen(false) : openNotif())}
              className="relative text-muted-foreground hover:text-foreground"
              title="새로 등록된 항목 알림"
            >
              <Bell size={17} />
              {unseen.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
                  {unseen.length > 9 ? "9+" : unseen.length}
                </span>
              )}
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
          <ScrollRestoration />
          <Outlet />
        </main>
      </div>

      {/* ── 우측 알림 패널 (새로 등록된 심사 대기 팝업) ── */}
      {notifOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setNotifOpen(false)} />
          <aside className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white border-l border-border shadow-xl z-50 flex flex-col">
            <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bell size={15} className="text-accent" /> 새 알림
                <span className="text-xs font-normal text-muted-foreground">심사 대기 {visiblePopups.length}건</span>
              </div>
              <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {visiblePopups.length === 0 && (
                <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                  새로 등록된 항목이 없습니다.
                </div>
              )}
              <ul className="divide-y divide-border">
                {visiblePopups.map((p) => (
                  <li key={p.id}>
                    <Link
                      to="/admin/popups"
                      onClick={() => { dismissNotif(p.id); setNotifOpen(false); }}
                      className="block px-4 py-3.5 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">팝업 등록</span>
                        <span className="text-[10px] text-muted-foreground ml-auto" style={{ fontFamily: "'DM Mono', monospace" }}>
                          {p.createdAt.slice(5, 16).replace("T", " ")}
                        </span>
                      </div>
                      <div className="text-[13px] font-medium truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{p.companyName} · 심사 대기 — 눌러서 심사하기</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t border-border text-[11px] text-muted-foreground shrink-0">
              1분마다 자동 갱신 · 현재는 팝업 등록 알림만 지원 (문의·신고 알림은 백엔드 구성 후 연동)
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
